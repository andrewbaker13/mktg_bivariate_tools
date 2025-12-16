/**
 * Game Core
 * Handles WebSocket connection, message routing, and global game state
 */

const API_BASE = window.API_BASE;
const WS_BASE = window.WS_BASE;

function connectWebSocket() {
    logTiming('wsConnectionStart', Date.now());
    
    // Show initial connecting state
    updateConnectionProgress();
    progressMessageInterval = setInterval(updateConnectionProgress, 1000);
    
    const wsUrl = `${WS_BASE}/ws/game/${roomCode}/?session_id=${playerSession.id}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = function(e) {
        logTiming('wsConnectionComplete', Date.now());
        console.log('WebSocket connected');
        
        // Clear connection progress interval
        if (progressMessageInterval) {
            clearInterval(progressMessageInterval);
            progressMessageInterval = null;
        }
        
        // Send identification
        websocket.send(JSON.stringify({
            action: 'identify',
            data: {
                player_session_id: playerSession.id,
                role: window.isProjectorMode ? 'spectator' : 'player'
            }
        }));
        
        // If we were waiting to enter, show that state
        if (isWaitingToEnter) {
            showWaitingState();
        } else {
            // Otherwise show generic waiting state until game starts
            showWaitingState();
        }
    };
    
    websocket.onmessage = function(e) {
        const message = JSON.parse(e.data);
        handleMessage(message);
    };
    
    websocket.onclose = function(e) {
        console.log('WebSocket closed:', e);
        if (progressMessageInterval) {
            clearInterval(progressMessageInterval);
            progressMessageInterval = null;
        }
        
        // Only show error if not a clean close
        if (!e.wasClean) {
            showConnectionError();
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        }
    };
    
    websocket.onerror = function(e) {
        console.error('WebSocket error:', e);
        // Error will be handled by onclose
    };
}

function updateConnectionProgress() {
    const elapsed = Math.floor((Date.now() - connectionAttemptStart) / 1000);
    const gameArea = document.getElementById('gameArea');
    
    if (elapsed < 5) {
        // First 5 seconds - just connecting
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⏳</div>
                <h2>Connecting to Game...</h2>
                <p style="color: #64748b;">Establishing secure connection</p>
                <div style="margin-top: 1.5rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
        `;
    } else if (elapsed < 60) {
        // 5-60 seconds - show it may take time
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⏳</div>
                <h2>Still Connecting...</h2>
                <p style="color: #64748b; margin-bottom: 0.5rem;">This may take 1-2 minutes on first load</p>
                <p style="color: #94a3b8; font-size: 0.875rem;">Time elapsed: ${elapsed}s</p>
                <div style="margin-top: 1.5rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <button onclick="location.reload()" style="background: #ef4444; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1.5rem;">
                    ❌ Cancel & Retry
                </button>
            </div>
        `;
    } else {
        // After 60 seconds - something may be wrong
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
                <h2>Connection Taking Longer Than Expected</h2>
                <p style="color: #f59e0b; margin-bottom: 0.5rem;">Still attempting to connect...</p>
                <p style="color: #64748b;">The server might be waking up from sleep mode.</p>
                <div style="margin-top: 1.5rem;">
                    <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-right: 10px;">
                        🔄 Reload Page
                    </button>
                    <a href="game-join.html" style="display: inline-block; background: #94a3b8; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        ⬅️ Back to Join
                    </a>
                </div>
            </div>
        `;
    }
}

function showConnectionError() {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `
        <div class="waiting-state" style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 1rem;">🔌</div>
            <h2>Connection Lost</h2>
            <p style="color: #ef4444;">Disconnected from game server</p>
            <p style="color: #64748b; margin-top: 0.5rem;">Attempting to reconnect...</p>
            <div style="margin-top: 1.5rem;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        </div>
    `;
}

function handleMessage(message) {
    console.log('Received message:', message.type);
    
    switch (message.type) {
        case 'connection_established':
            console.log('Connection established');
            // If we have a game type, show waiting state with that type
            if (message.game_session && message.game_session.game_type) {
                showWaitingState(message.game_session.game_type);
            } else if (message.game_type) {
                showWaitingState(message.game_type);
            }
            break;
            
        case 'identified':
            console.log('Player identified');
            // Preload all game scripts for this session
            if (message.game_types && message.game_types.length > 0) {
                preloadAllGameScripts(message.game_types);
            }
            break;
            
        case 'player_list_update':
            console.log('Players updated:', message.players);
            // Store players globally - CRITICAL for projector mode  
            window.latestPlayers = message.players || [];
            
            // Always update player count in projector mode
            if (window.isProjectorMode && message.players) {
                const playerCountEl = document.getElementById('playerCount');
                console.log('[PROJECTOR] Player count element:', playerCountEl);
                console.log('[PROJECTOR] Setting player count to:', message.players.length);
                if (playerCountEl) {
                    playerCountEl.textContent = message.players.length;
                    playerCountEl.style.color = '#1e293b';
                }
                // Update speed tap participation tracker
                if (window.speedTapParticipation) {
                    window.speedTapParticipation.totalPlayers = message.players.length;
                }
            }
            
            // Update speed tap participation tracker
            if (window.speedTapParticipation && message.players) {
                window.speedTapParticipation.totalPlayers = message.players.length;
            }
            break;
            
        case 'countdown_start':
            handleCountdownStart(message);
            break;
            
        case 'timer_sync':
            handleTimerSync(message);
            break;
            
        case 'game_started':
            handleGameStart(message);
            break;
            
        case 'speed_tap_answer':
            // Track participation in projector mode
            if (window.isProjectorMode && window.speedTapParticipation && message.player_id) {
                window.speedTapParticipation.respondedPlayers.add(message.player_id);
                if (typeof window.updateSpeedTapParticipation === 'function') {
                    window.updateSpeedTapParticipation();
                }
            }
            if (typeof handleSpeedTapAnswer === 'function') {
                handleSpeedTapAnswer(message);
            }
            break;
            
        case 'range_submitted':
            if (typeof handleRangeSubmitted === 'function') {
                handleRangeSubmitted(message);
            }
            break;
            
        case 'guess_submitted':
            // Handle personal confirmation for closest guess
            if (typeof handleRangeSubmitted === 'function') {
                // Map backend 'guess_submitted' format to what handleRangeSubmitted expects
                handleRangeSubmitted({
                    ...message,
                    player_id: playerSession.id // Ensure it's treated as own submission
                });
            }
            break;
            
        case 'guess_results':
            if (typeof handleGuessResults === 'function') {
                handleGuessResults(message);
            }
            break;
            
        case 'push_range_update':
            if (typeof handlePushRangeUpdate === 'function') {
                handlePushRangeUpdate(message);
            }
            break;
            
        case 'push_range_results':
            if (typeof handlePushRangeResults === 'function') {
                handlePushRangeResults(message);
            }
            break;
            
        case 'crowd_wisdom_distribution':
            if (typeof handleCrowdWisdomDistribution === 'function') {
                handleCrowdWisdomDistribution(message);
            }
            break;
            
        case 'crowd_wisdom_results':
            if (typeof handleCrowdWisdomResults === 'function') {
                handleCrowdWisdomResults(message);
            }
            break;
            
        case 'word_guess_correct':
            // Handle correct word guess confirmation
            if (typeof handleWordGuessResult === 'function') {
                handleWordGuessResult({
                    is_correct: true,
                    points: message.points,
                    correct_answer: message.answer
                });
            }
            break;

        case 'word_guess_incorrect':
            // Handle incorrect word guess feedback
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.innerHTML = `<div style="color: #ef4444; font-size: 18px;">❌ ${message.message}</div>`;
                setTimeout(() => { feedback.innerHTML = ''; }, 2000);
            }
            // Re-enable input
            const input = document.getElementById('wordGuessInput');
            const submitBtn = document.querySelector('.submit-word-btn');
            if (input) input.disabled = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Answer';
                submitBtn.style.opacity = '1';
            }
            break;

        case 'word_guess_reveal':
            if (typeof handleWordGuessReveal === 'function') {
                handleWordGuessReveal(message);
            }
            break;
            
        case 'word_guess_result':
            if (typeof handleWordGuessResult === 'function') {
                handleWordGuessResult(message);
            }
            break;
            
        case 'word_guess_results':
            // End of round results for Word Guess
            if (typeof handleWordGuessResults === 'function') {
                handleWordGuessResults(message);
            }
            break;
            
        case 'game_results':
            handleUnifiedGameResults(message);
            break;
            
        case 'leaderboard_update':
            updateLeaderboard(message.leaderboard);
            break;
            
        case 'game_ended':
            handleGameEnd(message);
            break;
            
        case 'round_changed':
            handleRoundChange(message);
            break;
            
        case 'error':
            handleError(message);
            break;
            
        case 'player_disconnected':
            console.log('Player disconnected:', message.player_id);
            break;
            
        case 'answer_result':
            // Handle wrong answer feedback for Speed Tap
            if (!message.is_correct) {
                const feedback = document.getElementById('feedback');
                if (feedback) {
                    feedback.innerHTML = `<div class="alert alert-danger">${message.message}</div>`;
                }
            }
            break;
    }
}

function getInstructionCardHTML(gameType) {
    // Get game type helper text
    const gameTypeHelpers = {
        'speed_tap': {
            title: '⚡ Speed Tap',
            description: 'Faster answers get more points (or lose more points!)<br>Answer quickly but correctly to maximize your score!'
        },
        'closest_guess': {
            title: '🎯 Closest Guess',
            description: 'Submit a range that captures the correct answer!<br>Narrower ranges earn bonus points. Answer quickly for speed bonuses!'
        },
        'push_range': {
            title: '🤜🟦🟥🤛 Push Range',
            description: 'Smash the button to help pick the range where the answer is!<br>Teamwork required! Riskier ranges earn more points.<br>Those who tap more earn more points if correct!'
        },
        'crowd_wisdom': {
            title: '🧠 Crowd Wisdom',
            description: 'Watch what others guess in real-time!<br>Points decrease as more people answer. Be bold - tough question bonuses await!'
        },
        'word_guess': {
            title: '🔤 Word Guess',
            description: 'Fill in the letters like hangman!<br>Letters reveal over time. Guess early for maximum points!'
        },
        'rpg_battle': {
            title: '⚔️ RPG Battle',
            description: 'Team up to defeat the boss!<br>Answer questions correctly to deal damage!'
        }
    };
    
    const helper = gameType && gameTypeHelpers[gameType] ? gameTypeHelpers[gameType] : null;
    
    if (!helper) return '';
    
    const fontSize = window.isProjectorMode ? '64px' : '2rem';
    const descSize = window.isProjectorMode ? '40px' : '1.1rem';
    const maxWidth = window.isProjectorMode ? '1200px' : '500px';
    const padding = window.isProjectorMode ? '3rem' : '2rem';
    
    return `
        <div class="instruction-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: ${padding}; border-radius: 12px; margin: 2rem auto; max-width: ${maxWidth}; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            <div class="title" style="font-size: ${fontSize}; margin-bottom: 1rem;">${helper.title}</div>
            <div class="description" style="font-size: ${descSize}; line-height: 1.6;">${helper.description}</div>
        </div>
    `;
}

function showWaitingState(gameTypeFromServer) {
    // Get game type helper text
    const gameTypeHelpers = {
        'speed_tap': {
            title: '⚡ Speed Tap',
            description: 'Faster answers get more points (or lose more points!)<br>Answer quickly but correctly to maximize your score!'
        },
        'closest_guess': {
            title: '🎯 Closest Guess',
            description: 'Submit a range that captures the correct answer!<br>Narrower ranges earn bonus points. Answer quickly for speed bonuses!'
        },
        'push_range': {
            title: '🤜🟦🟥🤛 Push Range',
            description: 'Smash the button to help pick the range where the answer is!<br>Teamwork required! Riskier ranges earn more points.<br>Those who tap more earn more points if correct!'
        },
        'crowd_wisdom': {
            title: '🧠 Crowd Wisdom',
            description: 'Watch what others guess in real-time!<br>Points decrease as more people answer. Be bold - tough question bonuses await!'
        },
        'word_guess': {
            title: '🔤 Word Guess',
            description: 'Fill in the letters like hangman!<br>Letters reveal over time. Guess early for maximum points!'
        },
        'rpg_battle': {
            title: '⚔️ RPG Battle',
            description: 'Team up to defeat the boss!<br>Answer questions correctly to deal damage!'
        }
    };
    
    const gameExplanationHTML = getInstructionCardHTML(gameTypeFromServer);
    
    // Check if player joined mid-round and is waiting
    if (isWaitingToEnter) {
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>⏸️ Waiting to Join...</h2>
                <div class="spinner"></div>
                <p style="color: #f59e0b; font-weight: 600;">You joined during an active round.</p>
                <p style="color: #64748b;">You'll be able to participate when the next round begins!</p>
                ${gameExplanationHTML}
            </div>
        `;
        return;
    }
    
    // Only show QR code if game hasn't started yet (no gameType or gameStartTime means pre-game)
    const showQR = !gameType && !gameStartTime;
    const qrCodeHTML = showQR ? `
                <div class="qr-code-box">
                    <h3>📱 Share with Classmates</h3>
                    <div id="qrcode"></div>
                    <p>Scan this QR code to join the game!</p>
                </div>
    ` : '';
    
    if (showQR) {
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>⏳ Waiting for game to start...</h2>
                <div class="spinner"></div>
                <p style="color: #64748b;">Your instructor will start the game soon</p>
                ${gameExplanationHTML}
                ${qrCodeHTML}
            </div>
        `;
    }
    
    // Generate QR code after DOM is updated
    setTimeout(() => {
        const qrCodeDiv = document.getElementById('qrcode');
        if (qrCodeDiv && roomCode && typeof QRCode !== 'undefined') {
            qrCodeDiv.innerHTML = ''; // Clear any existing
            const joinUrl = `https://drbakermarketing.com/admin_pages/games/game-join.html?room=${roomCode}`;
            new QRCode(qrCodeDiv, {
                text: joinUrl,
                width: 180,
                height: 180,
                colorDark: "#1e293b",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
            
            // Add Praxis Play logo overlay for branding consistency
            setTimeout(() => {
                const logo = document.createElement('img');
                logo.src = '../../art_assets/svg_logos/praxisplay_notext_logo.svg';
                logo.alt = 'Praxis Play';
                logo.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 38px; height: 38px; background: white; padding: 4px; border-radius: 0; box-shadow: 0 0 0 3px white; pointer-events: none;';
                qrCodeDiv.style.position = 'relative';
                qrCodeDiv.appendChild(logo);
            }, 100);
        }
    }, 100);
}

// Handle countdown event from WebSocket
async function handleCountdownStart(message) {
    const overlay = document.getElementById('countdownOverlay');
    const numberDiv = document.getElementById('countdownNumber');
    const roundInfo = document.getElementById('countdownRoundInfo');
    
    // CRITICAL: Clear gameArea to remove previous round's summary card
    // This prevents the player from being stuck on the results screen
    document.getElementById('gameArea').innerHTML = '';
    
    // Show overlay
    overlay.style.display = 'flex';
    roundInfo.textContent = `Round ${message.current_round} of ${message.total_rounds}`;
    
    // Countdown: 5, 4, 3, 2, 1 (matches backend 5 second duration)
    for (let count = 5; count >= 1; count--) {
        numberDiv.textContent = count;
        numberDiv.style.color = count <= 3 ? '#ef4444' : '#3b82f6'; // Red for final 3 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Show GO! briefly
    numberDiv.textContent = 'GO!';
    numberDiv.style.color = '#10b981';
    await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 500ms
    
    // Hide overlay
    overlay.style.display = 'none';
    
    // Now trigger the actual game start with embedded game data
    if (message.game_data) {
        handleGameStart(message.game_data);
    }
}

// Lazy load game-specific JavaScript modules
const loadedGameScripts = new Set();

async function preloadAllGameScripts(gameTypes) {
    // Remove duplicates
    const uniqueGameTypes = [...new Set(gameTypes)];
    const totalScripts = uniqueGameTypes.length;
    let loadedCount = 0;
    
    console.log('🎯 Preloading all game scripts:', uniqueGameTypes);
    
    try {
        // Load scripts sequentially to send progress updates
        for (const gameType of uniqueGameTypes) {
            await loadGameScript(gameType);
            loadedCount++;
            
            // Send progress update after each script loads
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'scripts_loading_progress',
                    data: { 
                        loaded_count: loadedCount,
                        total_count: totalScripts
                    }
                }));
            }
        }
        
        console.log('✅ All game scripts preloaded successfully!');
        
        // Notify backend that all scripts are loaded
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                action: 'scripts_loaded',
                data: { loaded: true }
            }));
        }
    } catch (error) {
        console.error('❌ Error preloading scripts:', error);
        // Still notify backend even if some failed - game will work with lazy loading fallback
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                action: 'scripts_loaded',
                data: { loaded: false, error: error.message }
            }));
        }
    }
}

async function loadGameScript(gameType) {
    // Map game types to their script files
    const gameScriptMap = {
        'speed_tap': 'game-speed-tap.js',
        'closest_guess': 'game-closest-guess.js',
        'push_range': 'game-push-range.js',
        'crowd_wisdom': 'game-crowd-wisdom.js',
        'word_guess': 'game-word-guess.js'
    };
    
    const scriptFile = gameScriptMap[gameType];
    if (!scriptFile) {
        console.warn(`No script mapping found for game type: ${gameType}`);
        return;
    }
    
    // Check if already loaded
    if (loadedGameScripts.has(gameType)) {
        console.log(`Game script already loaded: ${scriptFile}`);
        return;
    }
    
    console.log(`Loading game script: ${scriptFile}`);
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `js/${scriptFile}`;
        script.onload = () => {
            loadedGameScripts.add(gameType);
            console.log(`✅ Successfully loaded: ${scriptFile}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Failed to load: ${scriptFile}`);
            reject(new Error(`Failed to load ${scriptFile}`));
        };
        document.head.appendChild(script);
    });
}

async function handleGameStart(message) {
    gameType = message.game_type;
    gameStartTime = Date.now();
    
    // Update projector current round display
    if (window.isProjectorMode) {
        const currentRoundEl = document.getElementById('currentRound');
        const playerCountEl = document.getElementById('playerCount');
        
        console.log('[PROJECTOR] Round element:', currentRoundEl);
        console.log('[PROJECTOR] current_round:', message.current_round);
        
        // Backend sends current_round (1-indexed), not round_index
        if (currentRoundEl && message.current_round !== undefined) {
            currentRoundEl.textContent = message.current_round;
            currentRoundEl.style.color = '#1e293b';
            console.log('[PROJECTOR] Set round to:', message.current_round);
        }
        
        // Also refresh player count from latestPlayers or team_assignments
        if (playerCountEl) {
            let playerCount = 0;
            if (window.latestPlayers) {
                playerCount = window.latestPlayers.length;
            } else if (message.team_assignments) {
                // Fallback: count players from team_assignments
                playerCount = Object.keys(message.team_assignments).length;
            }
            if (playerCount > 0) {
                playerCountEl.textContent = playerCount;
                playerCountEl.style.color = '#1e293b';
                console.log('[PROJECTOR] Refreshed player count to:', playerCount);
            }
        }
    }
    
    // DEBUGGING: Log the entire message to see what we're receiving
    console.log('=== handleGameStart called ===');
    console.log('Full message object:', JSON.stringify(message, null, 2));
    
    // Re-enable submit button for new round
    const submitBtn = document.querySelector('.submit-guess-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
    
    // If player is waiting to enter, show waiting state instead of game
    if (isWaitingToEnter) {
        showWaitingState();
        return;
    }
    
    // Use custom time limit if provided, otherwise default to 20 seconds
    const timeLimit = (message.game_time_limit !== null && message.game_time_limit !== undefined) 
        ? message.game_time_limit 
        : 20;
    
    // Backend sends start_time which is the actual game start time (after countdown)
    // Use it directly - do NOT add countdown duration as that's already accounted for
    const startTime = message.start_time ? new Date(message.start_time).getTime() : Date.now();
    
    console.log('⏱️ Game timing:', {
        timeLimit: timeLimit,
        startTime: new Date(startTime).toISOString(),
        expectedEndTime: new Date(startTime + timeLimit * 1000).toISOString(),
        gameType: message.game_type
    });
    
    // Lazy load game-specific script if needed
    try {
        await loadGameScript(gameType);
    } catch (error) {
        console.error(`Failed to load game script for ${gameType}:`, error);
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
                <h2>Error Loading Game</h2>
                <p style="color: #ef4444;">Failed to load game module: ${gameType}</p>
                <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1rem;">
                    🔄 Reload Page
                </button>
            </div>
        `;
        return;
    }
    
    // Now call game-specific functions (they're guaranteed to be loaded)
    console.log(`🎮 Attempting to start ${gameType} game...`);
    
    if (gameType === 'speed_tap') {
        console.log('Checking showSpeedTapGame:', typeof showSpeedTapGame);
        if (typeof showSpeedTapGame === 'function') {
            showSpeedTapGame(message, timeLimit);
            console.log('Checking startSpeedTapTimer:', typeof startSpeedTapTimer);
            if (typeof startSpeedTapTimer === 'function') {
                startSpeedTapTimer(timeLimit, startTime);
            } else {
                console.error('❌ startSpeedTapTimer not found!');
            }
        } else {
            console.error('❌ showSpeedTapGame not found!');
        }
    } else if (gameType === 'closest_guess') {
        console.log('Checking showClosestGuessGame:', typeof showClosestGuessGame);
        if (typeof showClosestGuessGame === 'function') {
            showClosestGuessGame(message, timeLimit);
            console.log('Checking startTimer:', typeof startTimer);
            if (typeof startTimer === 'function') {
                startTimer(timeLimit, startTime);
            } else {
                console.error('❌ startTimer not found!');
            }
        } else {
            console.error('❌ showClosestGuessGame not found!');
        }
    } else if (gameType === 'push_range') {
        console.log('Checking showPushRangeGame:', typeof showPushRangeGame);
        if (typeof showPushRangeGame === 'function') {
            showPushRangeGame(message, timeLimit);
            console.log('Checking startPushRangeTimer:', typeof startPushRangeTimer);
            if (typeof startPushRangeTimer === 'function') {
                startPushRangeTimer(timeLimit, startTime);
            } else {
                console.error('❌ startPushRangeTimer not found!');
            }
        } else {
            console.error('❌ showPushRangeGame not found!');
        }
    } else if (gameType === 'crowd_wisdom') {
        console.log('Checking showCrowdWisdomGame:', typeof showCrowdWisdomGame);
        if (typeof showCrowdWisdomGame === 'function') {
            showCrowdWisdomGame(message, timeLimit);
            console.log('Checking startCrowdWisdomTimer:', typeof startCrowdWisdomTimer);
            if (typeof startCrowdWisdomTimer === 'function') {
                startCrowdWisdomTimer(timeLimit, startTime);
            } else {
                console.error('❌ startCrowdWisdomTimer not found!');
            }
        } else {
            console.error('❌ showCrowdWisdomGame not found!');
        }
    } else if (gameType === 'word_guess') {
        console.log('Checking showWordGuessGame:', typeof showWordGuessGame);
        if (typeof showWordGuessGame === 'function') {
            showWordGuessGame(message, timeLimit);
            console.log('Checking startWordGuessTimer:', typeof startWordGuessTimer);
            if (typeof startWordGuessTimer === 'function') {
                startWordGuessTimer(timeLimit, startTime);
            } else {
                console.error('❌ startWordGuessTimer not found!');
            }
        } else {
            console.error('❌ showWordGuessGame not found!');
        }
    } else {
        console.error('❌ Unknown game type:', gameType);
    }
}

function handleUnifiedGameResults(message) {
    console.log('Game results:', message);
    
    // Determine if this is the final round
    const isFinalRound = message.current_round >= message.total_rounds;
    const hasMoreRounds = !isFinalRound;
    
    // Store next game type if provided in this message (for immediate preview)
    if (message.next_game_type) {
        nextGameType = message.next_game_type;
        console.log('📋 Next game type from results:', nextGameType);
        
        // Preload the next game's script immediately so it's ready when the round starts
        if (hasMoreRounds) {
            console.log('⚡ Preloading next game script:', nextGameType);
            loadGameScript(nextGameType).catch(err => {
                console.error('❌ Failed to preload next game script:', err);
            });
        }
    }
    
    // If we were waiting to enter, we can now enter for the next round
    if (isWaitingToEnter) {
        isWaitingToEnter = false;
        sessionStorage.setItem('waitingToEnter', 'false');
    }
    
    if (message.round_stats) {
        // Find player's position and stats
        const leaderboard = latestLeaderboard || [];
        
        const myStats = message.round_stats.player_stats?.[playerSession.id] || {
            player_round_score: 0,
            player_total_score: 0
        };
        
        console.log('My stats:', myStats);
        
        // If stats are missing or all zeros, show a different message
        const hasValidStats = message.round_stats && (myStats.player_round_score > 0 || myStats.player_total_score > 0 || message.round_stats.percent_scored > 0);
        
        // Update header score
        const scoreEl = document.getElementById('playerScore');
        if (scoreEl && myStats) {
            scoreEl.textContent = myStats.player_total_score;
        }
        
        // Build game-specific details HTML
        let gameSpecificHTML = '';
        if (message.game_specific) {
            const gs = message.game_specific;
            
            if (message.game_type === 'speed_tap') {
                // Speed Tap: Show fastest correct player and answer stats
                if (gs.fastest_correct) {
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 14px; opacity: 0.9;">⚡ Fastest Correct</div>
                            <div style="font-size: 20px; font-weight: 700;">${gs.fastest_correct.player_name} <span style="opacity: 0.8; font-size: 14px;">(${gs.fastest_correct.response_time?.toFixed(2) || '?'}s)</span></div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: 8px 16px; border-radius: 20px;">❌ ${gs.incorrect_count} incorrect</span>
                        </div>
                    `;
                }
            } else if (message.game_type === 'closest_guess') {
                // Closest Guess: Show top scorer with their range
                if (gs.top_scorer) {
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 14px; opacity: 0.9;">🎯 Top Scorer</div>
                            <div style="font-size: 20px; font-weight: 700;">${gs.top_scorer.name} <span style="opacity: 0.8; font-size: 14px;">(${gs.top_scorer.points} pts, range: ${gs.top_scorer.range})</span></div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.correct_count}/${gs.total_guesses} captured answer</span>
                            ${gs.average_range_width ? `<span style="background: rgba(99,102,241,0.3); padding: 8px 16px; border-radius: 20px;">📊 Avg range: ${gs.average_range_width.toFixed(1)}</span>` : ''}
                        </div>
                    `;
                }
            } else if (message.game_type === 'push_range') {
                // Push Range: Show final range and whether it captured the answer
                const rangeColor = gs.is_correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
                const rangeIcon = gs.is_correct ? '✅' : '❌';
                gameSpecificHTML += `
                    <div style="background: ${rangeColor}; padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: 14px; opacity: 0.9;">${rangeIcon} Final Range</div>
                        <div style="font-size: 20px; font-weight: 700;">${gs.final_range} <span style="opacity: 0.8; font-size: 14px;">(Answer: ${message.correct_answer}%)</span></div>
                    </div>
                `;
                if (gs.top_pressers && gs.top_pressers.length > 0) {
                    const topPresser = gs.top_pressers[0];
                    const teamEmoji = topPresser.team === 'left' ? '🔵' : '🔴';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">🏆 Top Presser: ${teamEmoji} ${topPresser.player_name} (${topPresser.presses} presses)</span>
                        </div>
                    `;
                }
            } else if (message.game_type === 'crowd_wisdom') {
                // Crowd Wisdom: Show tough question bonus and distribution
                if (gs.was_tough_question) {
                    gameSpecificHTML += `
                        <div style="background: rgba(245,158,11,0.4); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 20px; font-weight: 700;">🏆 Tough Question Bonus!</div>
                            <div style="font-size: 14px; opacity: 0.9;">Correct answer wasn't the most popular - 2x points for those who got it right!</div>
                        </div>
                    `;
                }
                if (gs.top_scorer) {
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 14px; opacity: 0.9;">🧠 Top Scorer</div>
                            <div style="font-size: 20px; font-weight: 700;">${gs.top_scorer.name} <span style="opacity: 0.8; font-size: 14px;">(${gs.top_scorer.points} pts${gs.top_scorer.got_bonus ? ' 🏆' : ''})</span></div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    // Extract answer text - correct_answer might be an object with 'text' property or a string
                    const answerText = typeof message.correct_answer === 'object' ? 
                        (message.correct_answer.text || message.correct_answer.answer || JSON.stringify(message.correct_answer)) : 
                        message.correct_answer;
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize}; font-weight: 700;">Correct Answer: ${answerText}</div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: 8px 16px; border-radius: 20px;">❌ ${gs.incorrect_count} incorrect</span>
                            <span style="background: rgba(148,163,184,0.3); padding: 8px 16px; border-radius: 20px;">⏰ ${gs.no_answer_count} no answer</span>
                        </div>
                    `;
                }            } else if (message.game_type === 'word_guess') {
                // Word Guess: Show correct answer and statistics
                if (gs.fastest_correct) {
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 14px; opacity: 0.9;">⚡ Fastest Correct</div>
                            <div style="font-size: 20px; font-weight: 700;">${gs.fastest_correct.player_name} <span style="opacity: 0.8; font-size: 14px;">(${gs.fastest_correct.time_remaining?.toFixed(1) || '?'}s remaining)</span></div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize}; font-weight: 700;">Correct Answer: ${message.correct_answer.toUpperCase()}</div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(148,163,184,0.3); padding: 8px 16px; border-radius: 20px;">⏰ ${gs.no_answer_count} no answer</span>
                        </div>
                    `;
                }            }
        }
        
        const banner = document.createElement('div');
        banner.id = 'roundCompleteBanner';
        banner.style.cssText = 'margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: white;';
        
        if (hasValidStats) {
            banner.innerHTML = `
                <div style="text-align: center;">
                    <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">
                        🎉 Round ${message.current_round} of ${message.total_rounds} Complete!
                    </h2>
                    ${gameSpecificHTML}
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Players Scored</div>
                            <div style="font-size: 28px; font-weight: 700;">${message.round_stats.percent_scored}%</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Your Round Score</div>
                            <div style="font-size: 28px; font-weight: 700;">${myStats.player_round_score} pts</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total Score</div>
                            <div style="font-size: 28px; font-weight: 700;">${myStats.player_total_score} pts</div>
                        </div>
                    </div>
                    ${hasMoreRounds ? '<div style="margin-top: 15px; font-size: 16px; opacity: 0.9;">⏳ Waiting for instructor to start next round...</div>' : '<div style="margin-top: 15px; font-size: 18px; font-weight: 600;">🏁 Final Round Complete!</div>'}
                </div>
            `;
        } else {
            // Fallback if stats aren't available yet
            banner.innerHTML = `
                <div style="text-align: center;">
                    <h2 style="color: white; margin: 0 0 15px 0; font-size: 24px;">
                        🎉 Round ${message.current_round} of ${message.total_rounds} Complete!
                    </h2>
                    ${gameSpecificHTML}
                    <div style="font-size: 16px; opacity: 0.9; margin-top: 15px;">
                        Check the leaderboard for your score →
                    </div>
                    ${hasMoreRounds ? '<div style="margin-top: 15px; font-size: 16px; opacity: 0.9;">⏳ Waiting for instructor to start next round...</div>' : '<div style="margin-top: 15px; font-size: 18px; font-weight: 600;">🏁 Final Round Complete!</div>'}
                </div>
            `;
        }
        
        // Insert banner at the TOP of gameArea (before existing content)
        const gameArea = document.getElementById('gameArea');
        gameArea.insertBefore(banner, gameArea.firstChild);
        
        // If there are more rounds, show the instruction card for the NEXT game below the results
        if (hasMoreRounds && nextGameType) {
            console.log(`🎴 Rendering next game preview card for: ${nextGameType}`);
            const instructionCard = getInstructionCardHTML(nextGameType);
            if (instructionCard) {
                // Add a "Next Up" header to make it clear this is for the upcoming round
                const nextGameSection = document.createElement('div');
                const headerColor = window.isProjectorMode ? 'white' : '#64748b';
                const headerSize = window.isProjectorMode ? '56px' : '18px';
                nextGameSection.innerHTML = `
                    <div style="margin-top: 30px; text-align: center;">
                        <h3 style="color: ${headerColor}; font-size: ${headerSize}; margin-bottom: 15px;">📋 Next Round Preview</h3>
                        ${instructionCard}
                    </div>
                `;
                gameArea.appendChild(nextGameSection);
            } else {
                console.error(`❌ Failed to get instruction card for game type: ${nextGameType}`);
            }
        } else if (hasMoreRounds && !nextGameType) {
            console.warn('⚠️ More rounds exist but nextGameType is not set!');
        }
        
        // If this is the final round, automatically transition to final standings after 3 seconds
        if (isFinalRound) {
            setTimeout(() => {
                showFinalStandings(message, leaderboardVisibility);
            }, 3000);
        }
    } else {
        // Single-round game: replace with traditional game over screen
        const winnerText = message.winner 
            ? `🏆 Winner: ${message.winner}` 
            : (message.message || '⏱️ Time is up! No correct answers.');
        
        const detailsHTML = message.winner ? `
            ${message.response_time_ms ? `<strong>Time:</strong> ${message.response_time_ms}ms<br>` : ''}
            ${message.multiplier ? `<span class="multiplier-badge">${message.multiplier}x</span>` : ''}
        ` : '';
        
        document.getElementById('gameArea').innerHTML = `
            <div class="results-display">
                <h2>🎉 Game Over!</h2>
                <div class="result-card">
                    ${winnerText}<br>
                    ${detailsHTML}
                    <p style="margin-top: 15px; color: #64748b;">Check the leaderboard for final standings →</p>
                </div>
            </div>
        `;
    }
}

function showFinalStandings(message, leaderboardVisibility) {
    const gameArea = document.getElementById('gameArea');
    const isProjector = window.isProjectorMode || false;
    
    // Use the stored leaderboard instead of message.leaderboard
    const leaderboard = latestLeaderboard || [];
    
    // Check projector settings for leaderboard visibility
    const projectorShowsLeaderboard = window.isProjectorMode ? window.projectorSettings?.showLeaderboard : true;
    const shouldShowLeaderboard = leaderboardVisibility === 'always_show' && leaderboard.length > 0 && projectorShowsLeaderboard;
    
    // Find player's position and stats (skip in projector mode)
    let myPosition = -1;
    let myStats = { player_total_score: 0 };
    
    if (!isProjector && playerSession) {
        myPosition = leaderboard.length > 0 ? leaderboard.findIndex(p => 
            p.player_id === playerSession.id || p.player_name === playerSession.display_name
        ) : -1;
        
        myStats = message.round_stats?.player_stats?.[playerSession.id] || {
            player_total_score: playerSession.score || 0
        };
    }
    
    // Responsive sizing for projector vs player mode
    const iconSize = isProjector ? '128px' : '64px';
    const titleSize = isProjector ? '72px' : '32px';
    const subtitleSize = isProjector ? '36px' : '18px';
    const scoreContainerPadding = isProjector ? '40px' : '20px';
    const scoreLabelSize = isProjector ? '32px' : '16px';
    const scoreValueSize = isProjector ? '96px' : '48px';
    const rankSize = isProjector ? '36px' : '18px';
    const leaderboardTitleSize = isProjector ? '48px' : '24px';
    const leaderboardItemSize = isProjector ? '32px' : '16px';
    const leaderboardItemPadding = isProjector ? '16px' : '8px';
    
    let leaderboardHTML = '';
    if (shouldShowLeaderboard) {
        // Apply player name masking if in projector mode
        const getDisplayName = (name, index) => {
            if (window.isProjectorMode && !window.projectorSettings?.showPlayerNames) {
                return `Player ${index + 1}`;
            }
            return name;
        };
        
        leaderboardHTML = `
            <div class="leaderboard-preview" style="margin-top: ${isProjector ? '40px' : '20px'}; background: rgba(255,255,255,0.1); padding: ${isProjector ? '30px' : '15px'}; border-radius: ${isProjector ? '16px' : '8px'};">
                <h3 style="margin-bottom: ${isProjector ? '20px' : '10px'}; color: white; font-size: ${leaderboardTitleSize};">🏆 Final Leaderboard</h3>
                ${leaderboard.slice(0, 5).map((p, i) => `
                    <div style="display: flex; justify-content: space-between; padding: ${leaderboardItemPadding}; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: ${leaderboardItemSize};">
                        <span>#${i+1} ${getDisplayName(p.player_name, i)}</span>
                        <span style="font-weight: bold;">${p.score} pts</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // For projector mode, show leaderboard only (no personal score section)
    if (isProjector) {
        gameArea.innerHTML = `
            <div class="results-display" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 40px; text-align: center;">
                <div style="font-size: ${iconSize}; margin-bottom: 30px;">🏁</div>
                <h2 style="font-size: ${titleSize}; margin-bottom: 20px; font-weight: 800;">Game Complete!</h2>
                <p style="color: #94a3b8; font-size: ${subtitleSize};">Thanks for playing!</p>
                
                ${leaderboardHTML}
            </div>
        `;
    } else {
        // Player mode shows personal score + leaderboard
        gameArea.innerHTML = `
            <div class="results-display" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; text-align: center;">
                <div style="font-size: ${iconSize}; margin-bottom: 20px;">🏁</div>
                <h2 style="font-size: ${titleSize}; margin-bottom: 10px;">Game Complete!</h2>
                <p style="color: #94a3b8; font-size: ${subtitleSize};">Thanks for playing!</p>
                
                <div style="margin: 30px 0; padding: ${scoreContainerPadding}; background: rgba(255,255,255,0.1); border-radius: 12px;">
                    <div style="font-size: ${scoreLabelSize}; color: #94a3b8; margin-bottom: 5px;">Your Final Score</div>
                    <div style="font-size: ${scoreValueSize}; font-weight: 800; color: #3b82f6;">${myStats.player_total_score}</div>
                    ${myPosition !== -1 ? `<div style="font-size: ${rankSize}; color: #10b981; margin-top: 5px;">Rank #${myPosition + 1}</div>` : ''}
                </div>
                
                ${leaderboardHTML}
                
                <button onclick="location.reload()" style="margin-top: 30px; background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;">
                    🔄 Play Again
                </button>
            </div>
        `;
    }
}

function updateLeaderboard(leaderboard) {
    latestLeaderboard = leaderboard;
    
    // Update header score and rank from leaderboard
    if (playerSession && playerSession.display_name) {
        const myEntry = leaderboard.find(entry => entry.name === playerSession.display_name);
        if (myEntry) {
            const scoreEl = document.getElementById('playerScore');
            const rankEl = document.getElementById('playerRank');
            
            if (scoreEl) {
                scoreEl.textContent = myEntry.score;
            }
            
            if (rankEl && myEntry.rank) {
                rankEl.textContent = myEntry.rank;
            }
        }
    }
}

function handleGameEnd(message) {
    // Check if this is an intermediate round in a multi-round game
    const totalRounds = message.total_rounds || 1;
    const currentRound = message.current_round || 1;
    
    // If we have round stats, show the summary banner instead of just the waiting screen
    if (message.round_stats) {
        // Clear the game area first to remove the game interface
        document.getElementById('gameArea').innerHTML = '';
        // Show the unified results banner (which includes waiting message if needed)
        handleUnifiedGameResults(message);
        return;
    }
    
    if (totalRounds > 1 && currentRound < totalRounds) {
        // Intermediate round - show waiting state instead of game over
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>🎉 Round ${currentRound} Complete!</h2>
                <div class="spinner"></div>
                <p style="color: #64748b;">Waiting for instructor to start Round ${currentRound + 1}...</p>
                <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                    <h3>Current Standings</h3>
                    <p>Check the leaderboard screen for full results!</p>
                </div>
            </div>
        `;
    } else {
        // Final round - show final standings
        showFinalStandings(message, leaderboardVisibility);
    }
}

function handleRoundChange(message) {
    // Store the next game type for showing instructions in the summary card
    nextGameType = message.next_game_type;
    console.log('📋 Round changed - next game type:', nextGameType);
    
    // Note: We don't call showWaitingState here because handleUnifiedGameResults
    // already shows the summary card with next game instructions included
}

function handleError(message) {
    console.error('Game error:', message);
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = `<div class="alert alert-danger">${message.message}</div>`;
    }
}

// Global timer sync state
let expectedEndTime = null;
const SYNC_DRIFT_THRESHOLD = 1000; // 1 second

function handleTimerSync(message) {
    // Server sends time_remaining in seconds
    const serverTimeRemaining = message.time_remaining * 1000; // Convert to ms
    const newExpectedEndTime = Date.now() + serverTimeRemaining;
    
    // Check if we need to adjust for drift
    if (expectedEndTime !== null) {
        const drift = Math.abs(newExpectedEndTime - expectedEndTime);
        const driftSeconds = (drift / 1000).toFixed(2);
        
        console.log(`⏱️ Timer sync: server=${(message.time_remaining).toFixed(2)}s, drift=${driftSeconds}s`);
        
        if (drift > SYNC_DRIFT_THRESHOLD) {
            console.warn(`⚠️ Timer drift detected: ${driftSeconds}s - correcting expectedEndTime`);
            expectedEndTime = newExpectedEndTime;
            // Timer will auto-correct on next update since it checks expectedEndTime
        }
    } else {
        expectedEndTime = newExpectedEndTime;
    }
}

// Generic timer function (used by Closest Guess and potentially others)
function startTimer(seconds, startTime) {
    console.log('startTimer called for gameType:', gameType, 'seconds:', seconds);
    
    // Clear any existing timer first
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerEl = document.getElementById('timer');
    expectedEndTime = startTime + (seconds * 1000);
    const endTime = expectedEndTime;
    
    function updateTimer() {
        const now = Date.now();
        // Use sync-corrected expectedEndTime if available
        const currentEndTime = expectedEndTime || endTime;
        const remaining = Math.max(0, Math.ceil((currentEndTime - now) / 1000));
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
    
    // Update every 100ms for smooth countdown (not affected by tab throttling)
    timerInterval = setInterval(updateTimer, 100);
}

// Initialize connection when script loads
// Note: This should be called after all scripts are loaded
document.addEventListener('DOMContentLoaded', () => {
    // Populate header info immediately
    console.log('Populating header with playerSession:', playerSession);
    
    if (playerSession && playerSession.id) {
        const nameEl = document.getElementById('playerName');
        // Use display_name which is returned by the serializer
        const name = playerSession.display_name || 'Player';
        if (nameEl) {
            nameEl.textContent = name;
            console.log('Set player name to:', name);
        }
    }
    
    if (roomCode) {
        const roomEl = document.getElementById('roomCodeDisplay');
        if (roomEl) {
            roomEl.textContent = roomCode;
            console.log('Set room code to:', roomCode);
        }
    }

    // Only connect if we have a room code
    if (roomCode) {
        connectWebSocket();
    } else {
        console.error('No room code found in URL');
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>❌ Error</h2>
                <p>No room code provided.</p>
                <a href="game-join.html" style="display: inline-block; margin-top: 1rem; color: #3b82f6;">Return to Join Page</a>
            </div>
        `;
    }
});
