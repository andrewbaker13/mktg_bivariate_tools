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
let buzzerState = {
    phase: 'RESET', // RESET, ARMED, LIVE
    roundNumber: 1,
    roundId: null,
    releaseAtServerMs: null,
    leadTimeMs: 250,
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
            <span style="font-weight: 600; color: #1e293b;">${player.guest_name || player.username || 'Player'}</span>
            <span style="font-size: 0.85rem; color: #10b981;">✓ Ready</span>
        </div>
    `).join('');
}

function startBuzzerGame() {
    console.log('[BUZZER HOST] Starting buzzer game...');
    
    isGameStarted = true;
    
    // Hide setup screen, show game screen
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    // Update room code in game screen
    document.getElementById('roomCode').textContent = roomCode;
    
    // Send start_game message to backend
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'start_game',
            data: {}
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
    updatePlayerCount();
    updateNoBuzzList();
}

function handleBuzzerArmed(message) {
    console.log('[BUZZER HOST] Buzzer armed');
    buzzerState.phase = 'ARMED';
    buzzerState.roundId = message.roundId;
    
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
    
    // Keep final results visible
    updatePhaseIndicator();
    updateRoundNumber();
    updateControlButtons();
    showToast('Round ended', 'success');
}

// Host action functions
function armRound() {
    console.log('[BUZZER HOST] Arming round...');
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const roundId = `round_${Date.now()}`;
        
        websocket.send(JSON.stringify({
            action: 'buzzer_arm',
            data: {
                roundId,
                roundNumber: buzzerState.roundNumber
            }
        }));
    } else {
        showToast('Not connected', 'error');
    }
}

function enableBuzzer() {
    console.log('[BUZZER HOST] Enabling buzzer...');
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'buzzer_enable',
            data: {
                roundId: buzzerState.roundId,
                leadTimeMs: buzzerState.leadTimeMs
            }
        }));
    } else {
        showToast('Not connected', 'error');
    }
}

function resetRound() {
    console.log('[BUZZER HOST] Resetting round...');
    
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
    const indicator = document.getElementById('phaseIndicator');
    const text = document.getElementById('phaseText');
    
    indicator.className = 'phase-indicator';
    
    switch (buzzerState.phase) {
        case 'RESET':
            indicator.classList.add('reset');
            text.textContent = '⚪ ROUND ENDED';
            break;
        case 'ARMED':
            indicator.classList.add('armed');
            text.textContent = '🔶 ARMED - READY TO ENABLE';
            break;
        case 'LIVE':
            indicator.classList.add('live');
            text.textContent = '🟢 LIVE - BUZZER ACTIVE!';
            break;
    }
}

function updateRoundNumber() {
    document.getElementById('roundNumber').textContent = buzzerState.roundNumber;
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
    
    list.innerHTML = noBuzz.map(player => `
        <div class="buzz-item">
            <div class="buzz-player-info">
                <div class="buzz-player-name">${player.guest_name || player.username}</div>
                <div class="buzz-time">${buzzerState.phase === 'LIVE' ? 'Not buzzed yet' : 'No buzz this round'}</div>
            </div>
        </div>
    `).join('');
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

// Initialize
console.log('[BUZZER HOST] Module loaded');
