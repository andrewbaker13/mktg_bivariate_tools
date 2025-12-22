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
    falseStartPenalty: 250, // Configurable penalty (received from backend)
    myRank: null,
    clockOffsetMs: 0, // Client time ahead of server by this amount
    syncHistory: [], // Store last 5 sync measurements
    syncIntervalId: null,
    countdownIntervalId: null,
    autoResetMs: 0
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
    websocket.send(JSON.stringify({
        action: 'buzzer_time_ping',
        data: { clientSendMs }
    }));
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
            
            <div class="buzzer-button-container" id="buzzerButtonContainer">
                <button class="buzzer-btn locked" id="buzzerBtn" disabled>
                    DON'T PRESS
                </button>
            </div>
            
            <div id="countdownDisplay" style="display: none; text-align: center; margin: 1rem 0; padding: 1rem; background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; position: relative; z-index: 10;">
                <div style="font-size: 0.85rem; font-weight: 700; color: #92400e; margin-bottom: 0.25rem;">Round ends in</div>
                <div style="font-size: 2rem; font-weight: 900; color: #b45309; font-family: 'Courier New', monospace;" id="countdownTimer">--</div>
            </div>
            
            <div id="buzzerResultsDisplay" style="display: none; padding: 1rem;">
                <!-- Waiting message -->
                <div id="waitingMessage" style="text-align: center; padding: 2rem; background: #f8fafc; border-radius: 12px; margin-bottom: 1.5rem;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #475569;">Waiting for host to start next round...</div>
                </div>
                
                <!-- Results sections (same style as host) -->
                <div id="playerRankedSection" style="display: none; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 6px;">
                        🏆 Buzz Order
                    </div>
                    <div id="playerRankedList"></div>
                </div>
                
                <div id="playerFalseStartSection" style="display: none; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 6px;">
                        ❌ False Starts
                    </div>
                    <div id="playerFalseStartList"></div>
                </div>
                
                <div id="playerNoBuzzSection" style="display: none; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 6px;">
                        💤 Didn't Buzz
                    </div>
                    <div id="playerNoBuzzList"></div>
                </div>
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
        
        websocket.send(JSON.stringify({
            action: 'buzzer_false_start',
            data: {
                roundId: buzzerState.roundId,
                pressClientMs: now
            }
        }));
        
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
        
        websocket.send(JSON.stringify({
            action: 'buzzer_buzz',
            data: {
                roundId: buzzerState.roundId,
                pressServerMsEstimate
            }
        }));
        
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
    
    // Show button, hide results
    document.getElementById('buzzerButtonContainer').style.display = 'block';
    document.getElementById('buzzerResultsDisplay').style.display = 'none';
    
    // Store penalty setting if provided
    if (data.falseStartPenalty !== undefined) {
        buzzerState.falseStartPenalty = data.falseStartPenalty;
    }
    
    // Check if this player has a penalty
    const playerSession = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
    const myPlayerId = playerSession.id;
    const penalizedPlayerIds = data.penalizedPlayerIds || [];
    
    if (penalizedPlayerIds.includes(myPlayerId)) {
        buzzerState.hasPenalty = true;
        console.log(`[BUZZER] Player ${myPlayerId} has penalty: +${buzzerState.falseStartPenalty}ms delay`);
    } else {
        buzzerState.hasPenalty = false;
    }
    
    // Clear rank display
    document.getElementById('buzzerRankDisplay').style.display = 'none';
    document.getElementById('buzzerTop3').style.display = 'none';
    
    // Clear countdown
    clearCountdown();
    
    // Show penalty notice if applicable
    const penaltyNotice = document.getElementById('buzzerPenaltyNotice');
    if (buzzerState.hasPenalty) {
        const penaltyText = buzzerState.falseStartPenalty === 0 
            ? 'No delay penalty (but still disqualified last round)'
            : `${buzzerState.falseStartPenalty}ms delay this round (false start penalty)`;
        penaltyNotice.innerHTML = `⚠️ ${penaltyText}`;
        penaltyNotice.style.display = 'block';
    } else {
        penaltyNotice.style.display = 'none';
    }
    
    updateBuzzerButton('locked', 'DON\'T PRESS', false);
    updateBuzzerStatus('locked', '🔶 Round armed - button will turn green soon...');
    
    // Refresh time sync right before enable
    sendTimePing();
}

function handleBuzzerEnable(data) {
    console.log('[BUZZER] Buzzer enabled:', data);
    
    buzzerState.phase = 'LIVE';
    buzzerState.releaseAtServerMs = data.releaseAtServerMs;
    buzzerState.autoResetMs = data.autoResetMs || 0;
    
    console.log('[BUZZER] Auto-reset value received:', buzzerState.autoResetMs);
    
    // Store penalty setting
    buzzerState.falseStartPenalty = data.falseStartPenalty || 250;
    
    // Calculate when to show green button
    const serverNow = Date.now() - buzzerState.clockOffsetMs;
    let delayMs = buzzerState.releaseAtServerMs - serverNow;
    
    // Apply penalty if present
    if (buzzerState.hasPenalty) {
        delayMs += buzzerState.falseStartPenalty;
        console.log(`[BUZZER] Penalty applied: +${buzzerState.falseStartPenalty}ms delay`);
        // Clear penalty after applying
        buzzerState.hasPenalty = false;
    }
    
    updateBuzzerStatus('locked', '🟡 Get ready...');
    
    // Schedule button to turn green
    setTimeout(() => {
        if (!buzzerState.hasBuzzed && !buzzerState.isDisqualified) {
            updateBuzzerButton('live', '🟢 BUZZ IN', false);
            updateBuzzerStatus('live', '🟢 BUZZ NOW!');
        }
    }, Math.max(0, delayMs));
    
    // Start countdown if auto-reset is enabled
    if (buzzerState.autoResetMs > 0) {
        startCountdown(buzzerState.autoResetMs);
    }
}

function handleBuzzerReset(data) {
    console.log('[BUZZER] Round reset:', data);
    
    buzzerState.phase = 'RESET';
    
    // Clear countdown
    clearCountdown();
    
    // Hide button, show results
    document.getElementById('buzzerButtonContainer').style.display = 'none';
    document.getElementById('buzzerResultsDisplay').style.display = 'block';
    
    // Show results if available
    if (data.rankedBuzzers || data.falseStarts || data.allPlayers) {
        displayFullResults(data);
    }
    
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

function displayFullResults(data) {
    console.log('[BUZZER] Displaying full results:', data);
    
    const rankedSection = document.getElementById('playerRankedSection');
    const rankedList = document.getElementById('playerRankedList');
    const falseStartSection = document.getElementById('playerFalseStartSection');
    const falseStartList = document.getElementById('playerFalseStartList');
    const noBuzzSection = document.getElementById('playerNoBuzzSection');
    const noBuzzList = document.getElementById('playerNoBuzzList');
    
    // Get my player ID to highlight my entry
    const playerSession = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
    const myPlayerId = playerSession.id;
    
    // Display ranked buzzers
    if (data.rankedBuzzers && data.rankedBuzzers.length > 0) {
        rankedSection.style.display = 'block';
        rankedList.innerHTML = data.rankedBuzzers.map(buzz => {
            const isMe = buzz.playerId === myPlayerId;
            const rankClass = buzz.rank === 1 ? 'first' : buzz.rank === 2 ? 'second' : buzz.rank === 3 ? 'third' : 'other';
            const highlightStyle = isMe ? 'background: linear-gradient(90deg, #dbeafe 0%, white 100%); border: 2px solid #3b82f6;' : '';
            
            return `
                <div style="background: white; border: 2px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; ${highlightStyle}">
                    <div style="font-size: 1.5rem; font-weight: 900; width: 35px; text-align: center; color: ${rankClass === 'first' ? '#fbbf24' : rankClass === 'second' ? '#94a3b8' : rankClass === 'third' ? '#cd7f32' : '#cbd5e1'};">
                        ${buzz.rank}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">${buzz.playerName}${isMe ? ' (You)' : ''}</div>
                        <div style="font-size: 0.8rem; color: #64748b; font-family: 'Courier New', monospace; font-weight: 600;">+${buzz.timeAfterReleaseMs.toFixed(0)}ms</div>
                    </div>
                    ${buzz.hadPenalty ? '<div style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 800; background: #f59e0b; color: white;">PENALTY</div>' : ''}
                </div>
            `;
        }).join('');
    } else {
        rankedSection.style.display = 'none';
    }
    
    // Display false starts
    if (data.falseStarts && data.falseStarts.length > 0) {
        falseStartSection.style.display = 'block';
        falseStartList.innerHTML = data.falseStarts.map(player => {
            const isMe = player.playerId === myPlayerId;
            const highlightStyle = isMe ? 'background: linear-gradient(90deg, #fee2e2 0%, white 100%); border: 2px solid #ef4444;' : '';
            
            return `
                <div style="background: white; border: 2px solid #e2e8f0; border-left: 4px solid #ef4444; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; ${highlightStyle}">
                    <div style="flex: 1;">
                        <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">${player.playerName}${isMe ? ' (You)' : ''}</div>
                        <div style="font-size: 0.8rem; color: #64748b;">Pressed while locked</div>
                    </div>
                    <div style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 800; background: #ef4444; color: white;">FALSE START</div>
                </div>
            `;
        }).join('');
    } else {
        falseStartSection.style.display = 'none';
    }
    
    // Display no buzz players
    if (data.rankedBuzzers && data.falseStarts && data.allPlayers) {
        const buzzedIds = new Set([
            ...data.rankedBuzzers.map(b => b.playerId),
            ...data.falseStarts.map(f => f.playerId)
        ]);
        
        const noBuzzPlayers = data.allPlayers.filter(p => !buzzedIds.has(p.id));
        
        if (noBuzzPlayers.length > 0) {
            noBuzzSection.style.display = 'block';
            noBuzzList.innerHTML = noBuzzPlayers.map(player => {
                const isMe = player.id === myPlayerId;
                const playerName = player.display_name || player.guest_name || player.username || `Player ${player.id}`;
                const highlightStyle = isMe ? 'background: linear-gradient(90deg, #f1f5f9 0%, white 100%); border: 2px solid #94a3b8;' : '';
                
                return `
                    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; ${highlightStyle}">
                        <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">${playerName}${isMe ? ' (You)' : ''}</div>
                        <div style="font-size: 0.8rem; color: #64748b;">No buzz this round</div>
                    </div>
                `;
            }).join('');
        } else {
            noBuzzSection.style.display = 'none';
        }
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

// Countdown timer functions
function startCountdown(durationMs) {
    console.log('[BUZZER] Starting countdown:', durationMs, 'ms');
    
    clearCountdown();
    
    const countdownDisplay = document.getElementById('countdownDisplay');
    const countdownTimer = document.getElementById('countdownTimer');
    
    console.log('[BUZZER] Countdown elements:', countdownDisplay, countdownTimer);
    
    if (!countdownDisplay || !countdownTimer) {
        console.error('[BUZZER] Countdown elements not found!');
        return;
    }
    
    countdownDisplay.style.display = 'block';
    console.log('[BUZZER] Countdown display set to visible');
    
    let endTime = Date.now() + durationMs;
    
    function updateTimer() {
        const remaining = Math.max(0, endTime - Date.now());
        const seconds = (remaining / 1000).toFixed(1);
        
        countdownTimer.textContent = `${seconds}s`;
        
        // Change color as time runs out
        if (remaining <= 3000) {
            countdownDisplay.style.background = '#fee2e2';
            countdownDisplay.style.borderColor = '#ef4444';
            countdownTimer.style.color = '#dc2626';
        } else if (remaining <= 5000) {
            countdownDisplay.style.background = '#fef3c7';
            countdownDisplay.style.borderColor = '#fbbf24';
            countdownTimer.style.color = '#b45309';
        }
        
        if (remaining <= 0) {
            clearCountdown();
        }
    }
    
    // Update immediately
    updateTimer();
    
    // Update every 100ms for smooth countdown
    buzzerState.countdownIntervalId = setInterval(updateTimer, 100);
    console.log('[BUZZER] Countdown interval started');
}

function clearCountdown() {
    if (buzzerState.countdownIntervalId) {
        clearInterval(buzzerState.countdownIntervalId);
        buzzerState.countdownIntervalId = null;
    }
    
    const countdownDisplay = document.getElementById('countdownDisplay');
    if (countdownDisplay) {
        countdownDisplay.style.display = 'none';
    }
}

// Register buzzer message handlers
if (window.registerGameHandler) {
    window.registerGameHandler('buzzer_arm', handleBuzzerArm);
    window.registerGameHandler('buzzer_enable', handleBuzzerEnable);
    window.registerGameHandler('buzzer_reset', handleBuzzerReset);
    window.registerGameHandler('buzzer_state', handleBuzzerState);
    window.registerGameHandler('buzzer_time_pong', handleTimePong);
}

// Hide leaderboard for buzzer game (not relevant)
const leaderboard = document.getElementById('leaderboard');
if (leaderboard) {
    leaderboard.style.display = 'none';
}

// Cleanup on disconnect
window.addEventListener('beforeunload', () => {
    if (buzzerState.syncIntervalId) {
        clearInterval(buzzerState.syncIntervalId);
    }
    if (buzzerState.countdownIntervalId) {
        clearInterval(buzzerState.countdownIntervalId);
    }
});

console.log('[BUZZER] Module loaded');
