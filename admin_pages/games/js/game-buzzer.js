/**
 * Live Buzzer Game Module
 * Handles buzzer button states, time synchronization, and buzz submissions
 */

// Buzzer state
const buzzerState = {
    phase: 'RESET', // RESET, ARMED, LIVE
    roundId: null,
    releaseAtServerMs: null,
    hasBuzzed: false,
    isDisqualified: false,
    hasPenalty: false,
    penaltyDelayMs: 250,
    myRank: null,
    clockOffsetMs: 0, // Client time ahead of server by this amount
    syncHistory: [], // Store last 5 sync measurements
    syncIntervalId: null
};

// Time sync - track offset between client and server clocks
function startTimeSync() {
    console.log('[BUZZER] Starting time sync...');
    
    // Initial sync
    sendTimePing();
    
    // Periodic sync every 12 seconds
    if (buzzerState.syncIntervalId) {
        clearInterval(buzzerState.syncIntervalId);
    }
    buzzerState.syncIntervalId = setInterval(() => {
        sendTimePing();
    }, 12000);
}

function sendTimePing() {
    const clientSendMs = Date.now();
    sendMessage({
        action: 'buzzer_time_ping',
        data: { clientSendMs }
    });
}

function handleTimePong(data) {
    const clientReceiveMs = Date.now();
    const { clientSendMs, serverNowMs } = data;
    
    // Calculate round-trip time and one-way delay
    const rttMs = clientReceiveMs - clientSendMs;
    const owdMs = rttMs / 2;
    
    // Estimate offset: how much client is ahead of server
    const offsetMs = (clientSendMs + owdMs) - serverNowMs;
    
    console.log('[BUZZER TIME SYNC]', {
        rttMs: rttMs.toFixed(1),
        offsetMs: offsetMs.toFixed(1)
    });
    
    // Store in history (keep last 5)
    buzzerState.syncHistory.push({ rttMs, offsetMs, timestamp: clientReceiveMs });
    if (buzzerState.syncHistory.length > 5) {
        buzzerState.syncHistory.shift();
    }
    
    // Use "lowest RTT wins" strategy - most direct path
    const bestSync = buzzerState.syncHistory.reduce((best, current) => 
        current.rttMs < best.rttMs ? current : best
    );
    
    buzzerState.clockOffsetMs = bestSync.offsetMs;
    console.log('[BUZZER] Clock offset updated:', buzzerState.clockOffsetMs.toFixed(1), 'ms');
}

// Show buzzer UI
function showBuzzerUI(gameData) {
    console.log('[BUZZER] Initializing buzzer UI');
    
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `
        <div class="buzzer-area">
            <div class="buzzer-status locked" id="buzzerStatus">
                ⚪ Waiting for host to arm round...
            </div>
            
            <div id="buzzerPenaltyNotice" style="display: none;" class="buzzer-penalty-notice">
                ⚠️ You have a 250ms delay this round (false start penalty)
            </div>
            
            <div class="buzzer-button-container">
                <button class="buzzer-btn locked" id="buzzerBtn" disabled>
                    DON'T PRESS
                </button>
            </div>
            
            <div id="buzzerRankDisplay" style="display: none;" class="buzzer-rank-display">
                <div class="buzzer-rank-number" id="buzzerRankNumber">-</div>
                <div class="buzzer-rank-label" id="buzzerRankLabel">Your Rank</div>
            </div>
            
            <div id="buzzerTop3" style="display: none;" class="buzzer-top-3">
                <h3>🏆 Top 3</h3>
                <div id="buzzerTop3List"></div>
            </div>
        </div>
    `;
    
    // Attach button event
    const buzzerBtn = document.getElementById('buzzerBtn');
    buzzerBtn.addEventListener('click', handleBuzzerPress);
    
    // Start time synchronization
    startTimeSync();
}

// Handle buzzer button press
function handleBuzzerPress() {
    const now = Date.now();
    
    // Check if disqualified
    if (buzzerState.isDisqualified) {
        console.log('[BUZZER] Ignoring press - disqualified this round');
        return;
    }
    
    // Check if already buzzed
    if (buzzerState.hasBuzzed) {
        console.log('[BUZZER] Ignoring press - already buzzed');
        return;
    }
    
    // Check current phase
    if (buzzerState.phase === 'LOCKED' || buzzerState.phase === 'ARMED') {
        // FALSE START!
        console.log('[BUZZER] FALSE START - pressed while locked');
        buzzerState.isDisqualified = true;
        buzzerState.hasBuzzed = true;
        
        sendMessage({
            action: 'buzzer_false_start',
            data: {
                roundId: buzzerState.roundId,
                pressClientMs: now
            }
        });
        
        updateBuzzerButton('disqualified', '❌ FALSE START', true);
        updateBuzzerStatus('disqualified', 'FALSE START — OUT THIS ROUND');
        return;
    }
    
    if (buzzerState.phase === 'LIVE') {
        // Valid buzz!
        console.log('[BUZZER] Valid buzz!');
        buzzerState.hasBuzzed = true;
        
        // Calculate server timestamp estimate
        const pressServerMsEstimate = now - buzzerState.clockOffsetMs;
        
        sendMessage({
            action: 'buzzer_buzz',
            data: {
                roundId: buzzerState.roundId,
                pressServerMsEstimate
            }
        });
        
        updateBuzzerButton('buzzed', '✓ LOCKED IN', true);
        updateBuzzerStatus('buzzed', 'Buzz recorded! Waiting for your rank...');
    }
}

// Handle buzzer state updates from server
function handleBuzzerArm(data) {
    console.log('[BUZZER] Round armed:', data);
    
    buzzerState.phase = 'ARMED';
    buzzerState.roundId = data.roundId;
    buzzerState.hasBuzzed = false;
    buzzerState.isDisqualified = false;
    buzzerState.myRank = null;
    buzzerState.releaseAtServerMs = null;
    
    // Clear rank display
    document.getElementById('buzzerRankDisplay').style.display = 'none';
    document.getElementById('buzzerTop3').style.display = 'none';
    
    // Show penalty notice if applicable
    const penaltyNotice = document.getElementById('buzzerPenaltyNotice');
    if (buzzerState.hasPenalty) {
        penaltyNotice.style.display = 'block';
    } else {
        penaltyNotice.style.display = 'none';
    }
    
    updateBuzzerButton('locked', 'DON\'T PRESS', true);
    updateBuzzerStatus('locked', '🔶 Round armed - button will turn green soon...');
    
    // Refresh time sync right before enable
    sendTimePing();
}

function handleBuzzerEnable(data) {
    console.log('[BUZZER] Buzzer enabled:', data);
    
    buzzerState.phase = 'LIVE';
    buzzerState.releaseAtServerMs = data.releaseAtServerMs;
    
    // Calculate when to show green button
    const serverNow = Date.now() - buzzerState.clockOffsetMs;
    let delayMs = buzzerState.releaseAtServerMs - serverNow;
    
    // Apply penalty if present
    if (buzzerState.hasPenalty) {
        delayMs += buzzerState.penaltyDelayMs;
        console.log('[BUZZER] Penalty applied: +250ms delay');
        // Clear penalty after applying
        buzzerState.hasPenalty = false;
    }
    
    updateBuzzerStatus('locked', `🟡 Get ready... (${Math.max(0, Math.ceil(delayMs / 1000))}s)`);
    
    // Schedule button to turn green
    setTimeout(() => {
        if (!buzzerState.hasBuzzed && !buzzerState.isDisqualified) {
            updateBuzzerButton('live', '🟢 BUZZ IN', false);
            updateBuzzerStatus('live', '🟢 BUZZ NOW!');
        }
    }, Math.max(0, delayMs));
}

function handleBuzzerReset(data) {
    console.log('[BUZZER] Round reset:', data);
    
    buzzerState.phase = 'RESET';
    
    // Show results if available
    if (data.rankedBuzzers && data.rankedBuzzers.length > 0) {
        displayBuzzerResults(data);
    }
    
    updateBuzzerButton('locked', 'ROUND ENDED', true);
    updateBuzzerStatus('locked', '⚪ Round ended - waiting for next round...');
}

function handleBuzzerState(data) {
    console.log('[BUZZER] Buzzer state update:', data);
    
    // Update rank if provided
    if (data.myRank !== undefined && data.myRank !== null) {
        displayMyRank(data.myRank);
    }
    
    // Update top 3 if provided
    if (data.top3) {
        displayTop3(data.top3);
    }
    
    // Update penalty status
    if (data.hasPenaltyNextRound !== undefined) {
        buzzerState.hasPenalty = data.hasPenaltyNextRound;
    }
}

function displayMyRank(rank) {
    buzzerState.myRank = rank;
    
    const rankDisplay = document.getElementById('buzzerRankDisplay');
    const rankNumber = document.getElementById('buzzerRankNumber');
    const rankLabel = document.getElementById('buzzerRankLabel');
    
    rankDisplay.style.display = 'block';
    rankNumber.textContent = `#${rank}`;
    
    // Apply medal colors
    rankNumber.className = 'buzzer-rank-number';
    if (rank === 1) {
        rankNumber.classList.add('first');
        rankLabel.textContent = '🥇 First Place!';
        rankDisplay.classList.add('ranked');
    } else if (rank === 2) {
        rankNumber.classList.add('second');
        rankLabel.textContent = '🥈 Second Place!';
        rankDisplay.classList.add('ranked');
    } else if (rank === 3) {
        rankNumber.classList.add('third');
        rankLabel.textContent = '🥉 Third Place!';
        rankDisplay.classList.add('ranked');
    } else {
        rankLabel.textContent = 'Your Rank';
    }
}

function displayTop3(top3) {
    const top3Container = document.getElementById('buzzerTop3');
    const top3List = document.getElementById('buzzerTop3List');
    
    if (!top3 || top3.length === 0) return;
    
    top3Container.style.display = 'block';
    
    top3List.innerHTML = top3.map((player, index) => `
        <div class="buzzer-top-item">
            <span><strong>#${index + 1}</strong> ${player.name}</span>
            <span>${player.timeMs ? `${player.timeMs.toFixed(0)}ms` : '-'}</span>
        </div>
    `).join('');
}

function displayBuzzerResults(data) {
    // Show all ranked buzzers
    if (data.rankedBuzzers) {
        const myPlayerId = window.playerSessionId;
        const myBuzz = data.rankedBuzzers.find(b => b.playerId === myPlayerId);
        
        if (myBuzz) {
            displayMyRank(myBuzz.rank);
        } else if (!buzzerState.isDisqualified) {
            // Player didn't buzz
            updateBuzzerStatus('locked', '💤 You didn\'t buzz this round');
        }
        
        // Show top 3
        const top3 = data.rankedBuzzers.slice(0, 3).map(b => ({
            name: b.playerName,
            timeMs: b.timeAfterReleaseMs
        }));
        displayTop3(top3);
    }
}

function updateBuzzerButton(state, text, disabled) {
    const btn = document.getElementById('buzzerBtn');
    btn.className = `buzzer-btn ${state}`;
    btn.textContent = text;
    btn.disabled = disabled;
}

function updateBuzzerStatus(state, text) {
    const status = document.getElementById('buzzerStatus');
    status.className = `buzzer-status ${state}`;
    status.textContent = text;
}

// Register buzzer message handlers
if (window.registerGameHandler) {
    window.registerGameHandler('buzzer_arm', handleBuzzerArm);
    window.registerGameHandler('buzzer_enable', handleBuzzerEnable);
    window.registerGameHandler('buzzer_reset', handleBuzzerReset);
    window.registerGameHandler('buzzer_state', handleBuzzerState);
    window.registerGameHandler('buzzer_time_pong', handleTimePong);
}

// Cleanup on disconnect
window.addEventListener('beforeunload', () => {
    if (buzzerState.syncIntervalId) {
        clearInterval(buzzerState.syncIntervalId);
    }
});

console.log('[BUZZER] Module loaded');
