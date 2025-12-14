/**
 * Push Range Game Module
 * Handles the Push Range game mode logic
 */

let rapidPressCount = 0;
let rapidPressWindow = null;
let cooldownActive = false;
let cooldownTimeout = null;
let myTeam = 'left';
let myPressCount = 0;
let pendingPresses = 0;
let localLeftBoundary = 0;
let localRightBoundary = 100;
let totalPlayers = 10;
let teamRosters = {left: [], right: []};

function showPushRangeGame(message, timeLimit) {
    const imageHTML = message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: 100%; max-height: 25vh; margin: 0.5rem auto; border-radius: 8px; display: block; object-fit: contain;">` : '';
    
    // Get team assignment
    myTeam = message.team_assignments?.[playerSession.id]?.team || 'left';
    myPressCount = 0;
    pendingPresses = 0;
    localLeftBoundary = 0;
    localRightBoundary = 100;
    
    // Count total players for calculating press impact
    totalPlayers = Object.keys(message.team_assignments || {}).length || 10;
    
    // Organize team rosters
    teamRosters = {left: [], right: []};
    if (message.team_assignments) {
        Object.entries(message.team_assignments).forEach(([playerId, playerData]) => {
            teamRosters[playerData.team].push({
                id: parseInt(playerId),
                name: playerData.name,
                presses: 0
            });
        });
    }
    
    // Left team pushes the left boundary RIGHT (closing from the left)
    // Right team pushes the right boundary LEFT (closing from the right)
    const buttonHTML = myTeam === 'left' 
        ? '<button class="push-button left" id="pushButton">PUSH →</button>'
        : '<button class="push-button right" id="pushButton">← PUSH</button>';
    
    document.getElementById('gameArea').innerHTML = `
        <div class="push-range-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${imageHTML}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <div class="timer" id="timer">${timeLimit}</div>
                </div>
            </div>
            
            <div class="push-range-visualization">
                <div class="push-range-bar">
                    <div class="push-range-left-fill" id="leftFill" style="width: 0%"></div>
                    <div class="push-range-right-fill" id="rightFill" style="width: 0%"></div>
                </div>
                
                <!-- Bracket-style Guess Range Indicator -->
                <div class="guess-range-bracket" id="guessRangeBracket">
                    <div class="bracket-left-edge" id="bracketLeftEdge">
                        <span class="edge-value" id="leftEdgeValue">0%</span>
                    </div>
                    <div class="bracket-bottom">
                        <div class="bracket-label">
                            <span class="range-label">GUESS RANGE</span>
                            <!-- No percentage in the middle -->
                        </div>
                    </div>
                    <div class="bracket-right-edge" id="bracketRightEdge">
                        <span class="edge-value" id="rightEdgeValue">100%</span>
                    </div>
                </div>
            </div>
            
            <div class="push-button-container">
                ${buttonHTML}
                <div class="my-presses">Your Presses: <span id="myPressCount">0</span></div>
            </div>

            <div class="push-range-teams">
                <div class="team-panel left">
                    <h4>🔵 BLUE TEAM →</h4>
                    <div id="leftTeamRoster"></div>
                </div>
                <div class="team-panel right">
                    <h4>← 🔴 RED TEAM</h4>
                    <div id="rightTeamRoster"></div>
                </div>
            </div>
        </div>
    `;
    
    // Render initial team rosters
    updateTeamRosters();
    
    // Attach event handlers for speed tapping (each click/tap counts once)
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        // Prevent default to avoid unwanted behavior
        pushBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        
        // Mouse click - single press per click
        pushBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerPress();
        });
        
        // Touch tap - single press per tap
        pushBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            registerPress();
        });
        
        // Keyboard support (spacebar/Enter when focused) - prevent repeat
        pushBtn.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                e.preventDefault();
                registerPress();
            }
        });
    }
}

function registerPress() {
    // Check if cooldown is active
    if (cooldownActive) {
        return; // Ignore press during cooldown
    }
    
    // Track rapid pressing (5 presses in 1 second = cooldown)
    rapidPressCount++;
    
    // Start window timer on first press
    if (!rapidPressWindow) {
        rapidPressWindow = setTimeout(() => {
            rapidPressCount = 0;
            rapidPressWindow = null;
        }, 1000);
    }
    
    // Check if exceeded limit
    if (rapidPressCount >= 5) {
        activateCooldown();
        return;
    }
    
    pendingPresses++;
    myPressCount++;
    
    // Update local display
    document.getElementById('myPressCount').textContent = myPressCount;
    
    // OPTIMISTIC UPDATE: Move bar locally for instant feedback
    // Estimate: each press moves boundary ~0.1-0.5% depending on team size
    const moveAmount = Math.min(0.5, 5 / totalPlayers);
    
    if (myTeam === 'left') {
        localLeftBoundary = Math.min(localRightBoundary - 1, localLeftBoundary + moveAmount);
    } else {
        localRightBoundary = Math.max(localLeftBoundary + 1, localRightBoundary - moveAmount);
    }
    
    updateBarsLocally();
    
    // Send batches every 100ms (handled by the interval in sendPresses)
    if (pendingPresses >= 1) {
        sendPresses();
    }
}

function activateCooldown() {
    cooldownActive = true;
    rapidPressCount = 0;
    
    if (rapidPressWindow) {
        clearTimeout(rapidPressWindow);
        rapidPressWindow = null;
    }
    
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        pushBtn.disabled = true;
        pushBtn.style.opacity = '0.5';
        pushBtn.style.cursor = 'not-allowed';
        pushBtn.innerHTML = myTeam === 'left' ? '⚠️ COOL DOWN!' : '⚠️ COOL DOWN!';
    }
    
    // Countdown display
    let secondsLeft = 2;
    const countdownInterval = setInterval(() => {
        const pushBtn = document.getElementById('pushButton');
        if (pushBtn && secondsLeft > 0) {
            pushBtn.innerHTML = myTeam === 'left' 
                ? `⏱️ Cool down (${secondsLeft}s)` 
                : `⏱️ Cool down (${secondsLeft}s)`;
        }
        secondsLeft--;
    }, 1000);
    
    // Reset after 2 seconds
    cooldownTimeout = setTimeout(() => {
        clearInterval(countdownInterval);
        deactivateCooldown();
    }, 2000);
}

function deactivateCooldown() {
    cooldownActive = false;
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        pushBtn.disabled = false;
        pushBtn.style.opacity = '1';
        pushBtn.style.cursor = 'pointer';
        pushBtn.innerHTML = myTeam === 'left' ? 'PUSH →' : '← PUSH';
    }
}

function updateBarsLocally() {
    const leftFill = document.getElementById('leftFill');
    const rightFill = document.getElementById('rightFill');
    
    if (leftFill) leftFill.style.width = localLeftBoundary + '%';
    if (rightFill) rightFill.style.width = (100 - localRightBoundary) + '%';
    
    // Update bracket positions too
    const bracketLeftEdge = document.getElementById('bracketLeftEdge');
    const bracketRightEdge = document.getElementById('bracketRightEdge');
    const bracketBottom = document.querySelector('.bracket-bottom');
    const leftEdgeValue = document.getElementById('leftEdgeValue');
    const rightEdgeValue = document.getElementById('rightEdgeValue');
    const rangeWidthValue = document.getElementById('rangeWidthValue');
    
    const openRange = Math.round(localRightBoundary - localLeftBoundary);
    
    if (bracketLeftEdge) bracketLeftEdge.style.left = localLeftBoundary + '%';
    if (bracketRightEdge) bracketRightEdge.style.right = (100 - localRightBoundary) + '%';
    if (bracketBottom) {
        bracketBottom.style.left = localLeftBoundary + '%';
        bracketBottom.style.right = (100 - localRightBoundary) + '%';
    }
    
    if (leftEdgeValue) leftEdgeValue.textContent = Math.round(localLeftBoundary) + '%';
    if (rightEdgeValue) rightEdgeValue.textContent = Math.round(localRightBoundary) + '%';
    
    if (rangeWidthValue) {
        rangeWidthValue.textContent = openRange > 0 ? openRange + '%' : '⚠️';
        rangeWidthValue.classList.remove('danger', 'caution');
        if (openRange <= 20) {
            rangeWidthValue.classList.add('danger');
        } else if (openRange <= 40) {
            rangeWidthValue.classList.add('caution');
        }
    }
}

function sendPresses() {
    if (pendingPresses === 0) return;
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'push_range_press',
            data: {
                player_session_id: playerSession.id,
                press_count: pendingPresses,
                team: myTeam
            }
        }));
        pendingPresses = 0;
    }
}

function handlePushRangeUpdate(message) {
    // Sync with authoritative server state
    localLeftBoundary = message.left_boundary;
    localRightBoundary = message.right_boundary;
    
    // Update the visual bar fills
    const leftFill = document.getElementById('leftFill');
    const rightFill = document.getElementById('rightFill');
    
    if (leftFill) leftFill.style.width = localLeftBoundary + '%';
    if (rightFill) rightFill.style.width = (100 - localRightBoundary) + '%';
    
    // Update the bracket-style guess range indicator
    const bracketLeftEdge = document.getElementById('bracketLeftEdge');
    const bracketRightEdge = document.getElementById('bracketRightEdge');
    const bracketBottom = document.querySelector('.bracket-bottom');
    const leftEdgeValue = document.getElementById('leftEdgeValue');
    const rightEdgeValue = document.getElementById('rightEdgeValue');
    const rangeWidthValue = document.getElementById('rangeWidthValue');
    
    const leftBoundary = message.left_boundary;
    const rightBoundary = message.right_boundary;
    const openRange = Math.round(rightBoundary - leftBoundary);
    
    // Position bracket edges at the boundary positions
    if (bracketLeftEdge) bracketLeftEdge.style.left = leftBoundary + '%';
    if (bracketRightEdge) bracketRightEdge.style.right = (100 - rightBoundary) + '%';
    if (bracketBottom) {
        bracketBottom.style.left = leftBoundary + '%';
        bracketBottom.style.right = (100 - rightBoundary) + '%';
    }
    
    // Update edge values with bold percentages
    if (leftEdgeValue) leftEdgeValue.textContent = leftBoundary + '%';
    if (rightEdgeValue) rightEdgeValue.textContent = rightBoundary + '%';
    
    // Update range width value with color coding
    if (rangeWidthValue) {
        rangeWidthValue.textContent = openRange > 0 ? openRange + '%' : '⚠️';
        rangeWidthValue.classList.remove('danger', 'caution');
        if (openRange <= 20) {
            rangeWidthValue.classList.add('danger');
        } else if (openRange <= 40) {
            rangeWidthValue.classList.add('caution');
        }
    }
    
    // Update team rosters with press counts
    if (message.player_presses) {
        Object.entries(message.player_presses).forEach(([playerId, playerData]) => {
            const team = playerData.team;
            const roster = teamRosters[team];
            const player = roster.find(p => p.id === parseInt(playerId));
            if (player) {
                player.presses = playerData.presses;
            }
        });
        updateTeamRosters();
    }
}

function updateTeamRosters() {
    const leftRoster = document.getElementById('leftTeamRoster');
    const rightRoster = document.getElementById('rightTeamRoster');
    
    // Sort rosters by presses (descending)
    teamRosters.left.sort((a, b) => b.presses - a.presses);
    teamRosters.right.sort((a, b) => b.presses - a.presses);
    
    if (leftRoster) {
        leftRoster.innerHTML = teamRosters.left.map(player => {
            const isOwn = player.id === playerSession.id;
            return `<div class="team-member ${isOwn ? 'own' : ''}">
                <span>${player.name}</span>
                <span>${player.presses}</span>
            </div>`;
        }).join('');
    }
    
    if (rightRoster) {
        rightRoster.innerHTML = teamRosters.right.map(player => {
            const isOwn = player.id === playerSession.id;
            return `<div class="team-member ${isOwn ? 'own right-team' : ''}">
                <span>${player.name}</span>
                <span>${player.presses}</span>
            </div>`;
        }).join('');
    }
}

function handlePushRangeResults(message) {
    const resultClass = message.is_correct ? 'success' : 'failure';
    const resultIcon = message.is_correct ? '🎉' : '😞';
    const resultText = message.is_correct ? 'Success! The range captured the answer!' : 'The range missed the answer!';
    
    const topPressersHTML = message.top_pressers && message.top_pressers.length > 0 ? `
        <div class="top-pressers">
            <h4>🏆 Top Button Mashers</h4>
            ${message.top_pressers.map((presser, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                const teamColor = presser.team === 'left' ? '#3b82f6' : '#ef4444';
                return `<div class="top-presser-item">
                    <span>${medal} ${presser.name}</span>
                    <span style="color: ${teamColor}; font-weight: 700;">${presser.presses} presses</span>
                </div>`;
            }).join('')}
        </div>
    ` : '';
    
    document.getElementById('gameArea').innerHTML = `
        <div class="push-range-result ${resultClass}">
            <h2>${resultIcon} ${resultText}</h2>
            <div style="font-size: 1.5rem; margin: 1rem 0;">
                <strong>Correct Answer:</strong> ${message.correct_answer}%
            </div>
            <div style="font-size: 1.25rem; margin: 1rem 0;">
                <strong>Final Range:</strong> ${message.left_boundary}% - ${message.right_boundary}%
            </div>
            ${message.is_correct ? `
                <div style="margin-top: 1rem;">
                    <div><strong>🔴 Red Team Score:</strong> ${message.team_scores.left} pts</div>
                    <div><strong>🔵 Blue Team Score:</strong> ${message.team_scores.right} pts</div>
                </div>
            ` : ''}
            ${topPressersHTML}
            <p style="margin-top: 2rem; color: #64748b;">Check the leaderboard for updated standings →</p>
        </div>
    `;
}

function startPushRangeTimer(seconds, startTime) {
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
            
            // Disable all inputs universally
            disableAllInputs();
            
            // Send final presses
            if (pendingPresses > 0) {
                sendPresses();
            }
            
            // Notify server
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'push_range_timeout',
                    data: {
                        player_session_id: playerSession.id
                    }
                }));
            }
        }
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 100);
}

// Listen for player updates to keep rosters in sync
document.addEventListener('game-player-update', (e) => {
    const players = e.detail;
    
    // Only update if we are in push_range game mode (check if UI exists)
    const leftRoster = document.getElementById('leftTeamRoster');
    if (!leftRoster) return;
    
    // Rebuild rosters from the authoritative player list
    teamRosters = {left: [], right: []};
    
    players.forEach(p => {
        // Check game_state for team assignment
        // Note: game_state is added to player object in core/consumers.py
        const team = p.game_state?.push_range_team;
        
        if (team && (team === 'left' || team === 'right')) {
            teamRosters[team].push({
                id: p.id,
                name: p.name,
                presses: p.game_state.push_range_presses || 0
            });
        }
    });
    
    updateTeamRosters();
});
