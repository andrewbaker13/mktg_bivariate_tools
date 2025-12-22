/**
 * Live Buzzer Host Module
 * Handles host controls, WebSocket communication, and buzz order board management
 */

const API_BASE = window.API_BASE;
const WS_BASE = window.WS_BASE;
const JOIN_URL = window.JOIN_URL;

let websocket = null;
let roomCode = null;
let isGameStarted = false;
let autoResetTimer = null;
let hostCountdownInterval = null;
let buzzerState = {
    phase: 'RESET', // RESET, ARMED, LIVE
    roundNumber: 1,
    roundId: null,
    releaseAtServerMs: null,
    leadTimeMs: 250,
    autoResetMs: 0,
    rankedBuzzers: [],
    falseStarts: [],
    noBuzzPlayers: [],
    allPlayers: []
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeBuzzerHost();
});

async function initializeBuzzerHost() {
    console.log('[BUZZER HOST] Initializing...');
    
    // Check auth - use localStorage.getItem('auth_token') to match game-host.html pattern
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('[BUZZER HOST] No auth token found');
        alert('Please log in first');
        window.location.href = '../login.html';
        return;
    }
    
    console.log('[BUZZER HOST] Auth check passed');
    
    // Create buzzer session
    try {
        const response = await fetch(`${API_BASE}/game/buzzer/create/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            throw new Error('Failed to create buzzer session');
        }
        
        const data = await response.json();
        roomCode = data.room_code;
        
        console.log('[BUZZER HOST] Session created:', roomCode);
        
        // Update UI
        document.getElementById('roomCodeDisplay').textContent = roomCode;
        
        // Generate QR code
        generateQRCode();
        
        // Connect WebSocket
        connectWebSocket();
        
        // Start polling for players
        pollPlayers();
        
    } catch (error) {
        console.error('[BUZZER HOST] Error:', error);
        showToast('Failed to create buzzer session', 'error');
    }
}

function generateQRCode() {
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrElement = document.getElementById('qrcode');
    
    // Clear existing QR code
    qrElement.innerHTML = '';
    
    // Generate join URL
    const joinUrl = `${JOIN_URL}?room=${roomCode}`;
    
    try {
        new QRCode(qrElement, {
            text: joinUrl,
            width: 200,
            height: 200,
            colorDark: '#1e293b',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        
        qrContainer.style.display = 'block';
    } catch (error) {
        console.error('[BUZZER HOST] QR code generation error:', error);
    }
}

async function pollPlayers() {
    if (!roomCode) return;
    
    try {
        const response = await fetch(`${API_BASE}/game/${roomCode}/`);
        
        if (response.ok) {
            const data = await response.json();
            updateSetupPlayerList(data.players || []);
        }
    } catch (error) {
        console.error('[BUZZER HOST] Error polling players:', error);
    }
    
    // Poll every 2 seconds during setup
    if (!isGameStarted) {
        setTimeout(pollPlayers, 2000);
    }
}

function updateSetupPlayerList(players) {
    const list = document.getElementById('setupPlayerList');
    const count = document.getElementById('setupPlayerCount');
    const startBtn = document.getElementById('startBuzzerBtn');
    
    count.textContent = players.length;
    
    // Enable start button if at least one player
    startBtn.disabled = players.length === 0;
    
    if (players.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">⏳</div>
                <div>Waiting for players to join...</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = players.map(player => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: #f8fafc; border-radius: 8px;">
            <span style="font-weight: 600; color: #1e293b;">${player.display_name || 'Player'}</span>
            <span style="font-size: 0.85rem; color: #10b981;">✓ Ready</span>
        </div>
    `).join('');
}

function startBuzzerGame() {
    console.log('[BUZZER HOST] Starting buzzer game...');
    
    isGameStarted = true;
    
    // Capture penalty setting
    const penaltySelect = document.getElementById('penaltySelect');
    buzzerState.falseStartPenalty = parseInt(penaltySelect.value) || 250;
    console.log(`[BUZZER HOST] False start penalty set to ${buzzerState.falseStartPenalty}ms`);
    
    // Capture auto-reset timer setting
    const autoResetSelect = document.getElementById('autoResetSelect');
    buzzerState.autoResetMs = parseInt(autoResetSelect.value) || 0;
    console.log(`[BUZZER HOST] Auto-reset timer set to ${buzzerState.autoResetMs}ms`);
    
    // Hide setup screen, show game screen
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    // Update room code in game screen header
    document.getElementById('roomCode').textContent = roomCode;
    
    // Update room code in footer
    document.getElementById('roomCodeFooter').textContent = roomCode;
    
    // Generate footer QR code
    const qrFooter = document.getElementById('qrCodeFooter');
    qrFooter.innerHTML = '';
    const joinUrl = `${JOIN_URL}?room=${roomCode}`;
    try {
        new QRCode(qrFooter, {
            text: joinUrl,
            width: 80,
            height: 80,
            colorDark: '#1e293b',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('[BUZZER HOST] Footer QR code generation error:', error);
    }
    
    // Send start_game message to backend
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'start_game',
            data: {
                falseStartPenalty: buzzerState.falseStartPenalty
            }
        }));
    }
    
    showToast('Buzzer game started!', 'success');
}

function connectWebSocket() {
    console.log('[BUZZER HOST] Connecting WebSocket...');
    
    websocket = new WebSocket(`${WS_BASE}/ws/game/${roomCode}/`);
    
    websocket.onopen = function() {
        console.log('[BUZZER HOST] WebSocket connected');
        
        // Identify as host
        websocket.send(JSON.stringify({
            action: 'identify',
            data: {
                player_session_id: null,
                is_host: true
            }
        }));
    };
    
    websocket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        console.log('[BUZZER HOST] Message:', message.type, message);
        
        // Log error messages
        if (message.type === 'error') {
            console.error('[BUZZER HOST] Server error:', message.message);
        }
        
        handleWebSocketMessage(message);
    };
    
    websocket.onerror = function(error) {
        console.error('[BUZZER HOST] WebSocket error:', error);
        showToast('Connection error', 'error');
    };
    
    websocket.onclose = function() {
        console.log('[BUZZER HOST] WebSocket closed');
        showToast('Disconnected from server', 'warning');
    };
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'connection_established':
            console.log('[BUZZER HOST] Connection established');
            break;
            
        case 'player_joined':
            handlePlayerJoined(message);
            break;
            
        case 'player_list_update':
            handlePlayerListUpdate(message);
            break;
            
        case 'buzzer_armed':
            handleBuzzerArmed(message);
            break;
            
        case 'buzzer_enabled':
            handleBuzzerEnabled(message);
            break;
            
        case 'buzzer_state':
            handleBuzzerStateUpdate(message);
            break;
            
        case 'buzzer_state_update':
            handleBuzzerStateUpdate(message);
            break;
            
        case 'buzzer_reset':
            handleBuzzerReset(message);
            break;
            
        default:
            console.log('[BUZZER HOST] Unhandled message type:', message.type);
    }
}

function handlePlayerJoined(message) {
    console.log('[BUZZER HOST] Player joined:', message.player_name);
    showToast(`${message.player_name} joined`, 'success');
    updatePlayerCount();
}

function handlePlayerListUpdate(message) {
    console.log('[BUZZER HOST] Player list update:', message.players);
    buzzerState.allPlayers = message.players || [];
    console.log('[BUZZER HOST] All players:', buzzerState.allPlayers);
    updatePlayerCount();
    updateNoBuzzList();
}

function handleBuzzerArmed(message) {
    console.log('[BUZZER HOST] Buzzer armed');
    buzzerState.phase = 'ARMED';
    buzzerState.roundId = message.roundId;
    
    // Clear previous round results
    buzzerState.rankedBuzzers = [];
    buzzerState.falseStarts = [];
    
    // Update all lists (clears buzz order/false starts, moves everyone to No Buzz)
    updateRankedList();
    updateFalseStartList();
    updateNoBuzzList();
    
    updatePhaseIndicator();
    updateControlButtons();
    showToast('Round armed', 'success');
}

function handleBuzzerEnabled(message) {
    console.log('[BUZZER HOST] Buzzer enabled');
    buzzerState.phase = 'LIVE';
    buzzerState.releaseAtServerMs = message.releaseAtServerMs;
    
    updatePhaseIndicator();
    updateControlButtons();
    showToast('Buzzer is LIVE!', 'success');
}

function handleBuzzerStateUpdate(message) {
    console.log('[BUZZER HOST] Buzzer state update:', message);
    
    // Update buzz lists
    if (message.rankedBuzzers) {
        buzzerState.rankedBuzzers = message.rankedBuzzers;
        updateRankedList();
    }
    
    if (message.falseStarts) {
        buzzerState.falseStarts = message.falseStarts;
        updateFalseStartList();
    }
    
    updateNoBuzzList();
}

function handleBuzzerReset(message) {
    console.log('[BUZZER HOST] Round reset');
    buzzerState.phase = 'RESET';
    buzzerState.roundNumber++;
    
    // Display the lead time that was used for this round
    const leadTimeDisplay = document.getElementById('leadTimeDisplay');
    const leadTimeValue = document.getElementById('leadTimeValue');
    if (leadTimeDisplay && leadTimeValue) {
        leadTimeValue.textContent = buzzerState.leadTimeMs;
        leadTimeDisplay.style.display = 'block';
    }
    
    // Keep final results visible
    updatePhaseIndicator();
    updateControlButtons();
    showToast('Round ended', 'success');
}

// Host action functions
function armRound() {
    console.log('[BUZZER HOST] Arming round...');
    
    // Clear any active auto-reset timer from previous round
    clearAutoResetTimer();
    
    // Generate random lead time between 200ms and 800ms for this round
    buzzerState.leadTimeMs = Math.floor(Math.random() * (800 - 200 + 1)) + 200;
    console.log(`[BUZZER HOST] Random lead time for this round: ${buzzerState.leadTimeMs}ms`);
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const roundId = `round_${Date.now()}`;
        
        websocket.send(JSON.stringify({
            action: 'buzzer_arm',
            data: {
                roundId,
                roundNumber: buzzerState.roundNumber,
                falseStartPenalty: buzzerState.falseStartPenalty || 250
            }
        }));
    } else {
        showToast('Not connected', 'error');
    }
}

function enableBuzzer() {
    console.log('[BUZZER HOST] Enabling buzzer...');
    console.log(`[BUZZER HOST] Using lead time: ${buzzerState.leadTimeMs}ms`);
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'buzzer_enable',
            data: {
                roundId: buzzerState.roundId,
                leadTimeMs: buzzerState.leadTimeMs,
                autoResetMs: buzzerState.autoResetMs
            }
        }));
        
        // Start auto-reset timer if enabled
        if (buzzerState.autoResetMs > 0) {
            console.log(`[BUZZER HOST] Starting auto-reset timer: ${buzzerState.autoResetMs}ms`);
            clearAutoResetTimer();
            
            // Start visual countdown
            startHostCountdown(buzzerState.autoResetMs);
            
            autoResetTimer = setTimeout(() => {
                console.log('[BUZZER HOST] Auto-reset timer expired, resetting round...');
                showToast('Round auto-reset', 'warning');
                resetRound();
            }, buzzerState.autoResetMs);
        }
    } else {
        showToast('Not connected', 'error');
    }
}

function resetRound() {
    console.log('[BUZZER HOST] Resetting round...');
    
    // Clear any active auto-reset timer
    clearAutoResetTimer();
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'buzzer_reset',
            data: {
                roundId: buzzerState.roundId
            }
        }));
    } else {
        showToast('Not connected', 'error');
    }
}

function clearAutoResetTimer() {
    if (autoResetTimer) {
        console.log('[BUZZER HOST] Clearing auto-reset timer');
        clearTimeout(autoResetTimer);
        autoResetTimer = null;
    }
    clearHostCountdown();
}

function exitBuzzer() {
    if (confirm('Exit buzzer mode?')) {
        if (websocket) {
            websocket.close();
        }
        window.location.href = '../games/game-host.html';
    }
}

// UI update functions
function updatePhaseIndicator() {
    const status = document.getElementById('gameStatus');
    const text = document.getElementById('statusText');
    
    if (!status || !text) return; // Elements might not exist on setup screen
    
    status.className = 'game-status';
    
    switch (buzzerState.phase) {
        case 'RESET':
            status.classList.add('reset');
            text.textContent = '⚪ RESET';
            break;
        case 'ARMED':
            status.classList.add('armed');
            text.textContent = '🔶 ARMED';
            break;
        case 'LIVE':
            status.classList.add('live');
            text.textContent = '🟢 LIVE';
            break;
    }
}

function updatePlayerCount() {
    const count = buzzerState.allPlayers.length;
    document.getElementById('playerCount').textContent = count;
}

function updateControlButtons() {
    const btnArm = document.getElementById('btnArm');
    const btnEnable = document.getElementById('btnEnable');
    const btnReset = document.getElementById('btnReset');
    
    // ARM button: enabled only in RESET phase
    btnArm.disabled = buzzerState.phase !== 'RESET';
    
    // ENABLE button: enabled only in ARMED phase
    btnEnable.disabled = buzzerState.phase !== 'ARMED';
    
    // RESET button: enabled in LIVE phase
    btnReset.disabled = buzzerState.phase === 'RESET';
}

function updateRankedList() {
    const list = document.getElementById('rankedList');
    const section = document.getElementById('rankedSection');
    const count = document.getElementById('rankedCount');
    
    count.textContent = buzzerState.rankedBuzzers.length;
    
    if (buzzerState.rankedBuzzers.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏱️</div>
                <div>No buzzes yet</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = buzzerState.rankedBuzzers.map(buzz => {
        const rankClass = buzz.rank === 1 ? 'first' : buzz.rank === 2 ? 'second' : buzz.rank === 3 ? 'third' : 'other';
        return `
            <div class="buzz-item ranked">
                <div class="buzz-rank ${rankClass}">${buzz.rank}</div>
                <div class="buzz-player-info">
                    <div class="buzz-player-name">${buzz.playerName}</div>
                    <div class="buzz-time">+${buzz.timeAfterReleaseMs.toFixed(0)}ms</div>
                </div>
                ${buzz.hadPenalty ? '<div class="buzz-badge penalty">PENALTY</div>' : ''}
            </div>
        `;
    }).join('');
}

function updateFalseStartList() {
    const list = document.getElementById('falseStartList');
    const section = document.getElementById('falseStartSection');
    const count = document.getElementById('falseStartCount');
    
    count.textContent = buzzerState.falseStarts.length;
    
    if (buzzerState.falseStarts.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    list.innerHTML = buzzerState.falseStarts.map(player => `
        <div class="buzz-item false-start">
            <div class="buzz-player-info">
                <div class="buzz-player-name">${player.playerName}</div>
                <div class="buzz-time">Pressed while locked</div>
            </div>
            <div class="buzz-badge false-start">FALSE START</div>
        </div>
    `).join('');
}

function updateNoBuzzList() {
    const list = document.getElementById('noBuzzList');
    const count = document.getElementById('noBuzzCount');
    
    // Determine who hasn't buzzed
    const buzzedIds = new Set([
        ...buzzerState.rankedBuzzers.map(b => b.playerId),
        ...buzzerState.falseStarts.map(f => f.playerId)
    ]);
    
    const noBuzz = buzzerState.allPlayers.filter(p => !buzzedIds.has(p.id));
    
    count.textContent = noBuzz.length;
    
    if (noBuzz.length === 0 && buzzerState.allPlayers.length > 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div>Everyone has buzzed!</div>
            </div>
        `;
        return;
    }
    
    if (buzzerState.allPlayers.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div>Waiting for players...</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = noBuzz.map(player => {
        const playerName = player.display_name || player.guest_name || player.username || `Player ${player.id}`;
        return `
        <div class="buzz-item">
            <div class="buzz-player-info">
                <div class="buzz-player-name">${playerName}</div>
                <div class="buzz-time">${buzzerState.phase === 'LIVE' ? 'Not buzzed yet' : 'No buzz this round'}</div>
            </div>
        </div>
    `}).join('');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// Host countdown timer functions
function startHostCountdown(durationMs) {
    console.log('[BUZZER HOST] Starting visual countdown:', durationMs, 'ms');
    
    clearHostCountdown();
    
    const countdownDisplay = document.getElementById('hostCountdownDisplay');
    const countdownTimer = document.getElementById('hostCountdownTimer');
    
    if (!countdownDisplay || !countdownTimer) return;
    
    countdownDisplay.style.display = 'block';
    
    let endTime = Date.now() + durationMs;
    
    function updateTimer() {
        const remaining = Math.max(0, endTime - Date.now());
        const seconds = (remaining / 1000).toFixed(1);
        
        countdownTimer.textContent = `${seconds}s`;
        
        // Change color as time runs out
        if (remaining <= 3000) {
            countdownDisplay.style.background = '#fee2e2';
            countdownDisplay.style.borderColor = '#ef4444';
            countdownDisplay.style.color = '#dc2626';
        } else if (remaining <= 5000) {
            countdownDisplay.style.background = '#fef3c7';
            countdownDisplay.style.borderColor = '#fbbf24';
            countdownDisplay.style.color = '#92400e';
        }
        
        if (remaining <= 0) {
            clearHostCountdown();
        }
    }
    
    // Update immediately
    updateTimer();
    
    // Update every 100ms for smooth countdown
    hostCountdownInterval = setInterval(updateTimer, 100);
}

function clearHostCountdown() {
    if (hostCountdownInterval) {
        clearInterval(hostCountdownInterval);
        hostCountdownInterval = null;
    }
    
    const countdownDisplay = document.getElementById('hostCountdownDisplay');
    if (countdownDisplay) {
        countdownDisplay.style.display = 'none';
    }
}

// Initialize
console.log('[BUZZER HOST] Module loaded');
