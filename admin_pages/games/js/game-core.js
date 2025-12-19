/**
 * Game Core
 * Handles WebSocket connection, message routing, and global game state
 */

const API_BASE = window.API_BASE;
const WS_BASE = window.WS_BASE;

// 🚧 DEV MODE - Mock WebSocket for UI testing without backend
class MockWebSocket {
    constructor(url) {
        console.log('🚧 MockWebSocket created:', url);
        this.url = url;
        this.readyState = 0; // CONNECTING
        
        // Simulate connection opening
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) {
                console.log('🚧 MockWebSocket: Triggering onopen');
                this.onopen({});
            }
            
            // Load snapshot data
            this.loadSnapshot();
        }, 100);
    }
    
    async loadSnapshot() {
        try {
            const snapshotPath = window.DEV_SNAPSHOT_PATH;
            console.log('🚧 Loading snapshot from:', snapshotPath);
            
            const response = await fetch(snapshotPath);
            if (!response.ok) {
                throw new Error(`Failed to load snapshot: ${response.status}`);
            }
            
            const snapshot = await response.json();
            console.log('🚧 Snapshot loaded:', snapshot.type);
            
            // 🚧 DEV MODE: Dynamically update timestamps to "now" so timer doesn't instantly expire
            if (snapshot.type === 'game_started' && snapshot.start_time) {
                const now = new Date().toISOString();
                console.log(`🚧 Updating start_time from ${snapshot.start_time} to ${now}`);
                snapshot.start_time = now;
                
                // Override time limit to 30 seconds for faster dev testing
                console.log(`🚧 Overriding game_time_limit from ${snapshot.game_time_limit} to 30 seconds`);
                snapshot.game_time_limit = 30;
            }
            
            // Send snapshot message to game handler
            setTimeout(() => {
                if (this.onmessage) {
                    console.log('🚧 MockWebSocket: Sending snapshot message');
                    this.onmessage({ data: JSON.stringify(snapshot) });
                }
                
                // 🚧 DEV MODE: Send initial leaderboard if snapshot has one
                if (snapshot.leaderboard) {
                    setTimeout(() => {
                        console.log('🚧 MockWebSocket: Sending initial leaderboard');
                        this.simulateMessage({
                            type: 'leaderboard_update',
                            leaderboard: snapshot.leaderboard
                        });
                    }, 300);
                }
                
                // 🚧 DEV MODE: For projector, simulate players list
                if (snapshot.players && window.isProjectorMode) {
                    setTimeout(() => {
                        console.log('🚧 MockWebSocket: Sending player list for projector');
                        this.simulateMessage({
                            type: 'player_list_update',
                            players: snapshot.players
                        });
                    }, 400);
                }
                
                // 🚧 DEV MODE: For push_range, send periodic boundary updates
                if (snapshot.game_type === 'push_range' && snapshot.team_assignments) {
                    // Simulate boundary updates every 2 seconds
                    let leftBoundary = 0;
                    let rightBoundary = 100;
                    const updateInterval = setInterval(() => {
                        leftBoundary = Math.min(leftBoundary + Math.random() * 3, 45);
                        rightBoundary = Math.max(rightBoundary - Math.random() * 3, 55);
                        
                        console.log(`🚧 MockWebSocket: Sending push_range_update (left: ${leftBoundary.toFixed(1)}%, right: ${rightBoundary.toFixed(1)}%)`);
                        this.simulateMessage({
                            type: 'push_range_update',
                            left_boundary: parseFloat(leftBoundary.toFixed(2)),
                            right_boundary: parseFloat(rightBoundary.toFixed(2)),
                            team_stats: {
                                left: { total_presses: Math.floor(leftBoundary * 10), players: 5 },
                                right: { total_presses: Math.floor((100 - rightBoundary) * 10), players: 5 }
                            }
                        });
                    }, 2000);
                    
                    // Stop updates after 30 seconds (or time limit)
                    setTimeout(() => clearInterval(updateInterval), (snapshot.game_time_limit || 30) * 1000);
                }
                
                // 🚧 DEV MODE: For closest_guess, send submitted_ranges as range_submitted messages
                if (snapshot.submitted_ranges && snapshot.game_type === 'closest_guess') {
                    snapshot.submitted_ranges.forEach((range, index) => {
                        setTimeout(() => {
                            console.log(`🚧 MockWebSocket: Sending range submission from ${range.player_name}`);
                            this.simulateMessage({
                                type: 'range_submitted',
                                player_id: range.player_id,
                                player_name: range.player_name,
                                guess_min: range.min,
                                guess_max: range.max
                            });
                        }, 500 + (index * 150));
                    });
                }
                
                // 🚧 DEV MODE: For crowd_wisdom, send distribution updates
                if (snapshot.distribution_updates && snapshot.game_type === 'crowd_wisdom') {
                    snapshot.distribution_updates.forEach((update) => {
                        setTimeout(() => {
                            console.log(`🚧 MockWebSocket: Sending crowd wisdom distribution update`);
                            this.simulateMessage({
                                type: 'crowd_wisdom_distribution',
                                distribution: update.distribution,
                                percent_answered: update.percent_answered,
                                percent_unanswered: update.percent_unanswered
                            });
                        }, update.delay_ms);
                    });
                }
                
                // 🚧 DEV MODE: For line_fit, send scatter data
                if (snapshot.game_type === 'line_fit') {
                    // Send scatter data immediately after game starts
                    if (snapshot.scatter_data_message) {
                        setTimeout(() => {
                            console.log('🚧 MockWebSocket: Sending line fit scatter data');
                            this.simulateMessage(snapshot.scatter_data_message);
                        }, 500);
                    }
                    
                    // NOTE: other_submissions should NOT be sent during active game
                    // They should only appear in the results phase (game_results message)
                }
                
                // 🚧 DEV MODE: For word_guess, simulate letter reveals over time
                if (snapshot.game_type === 'word_guess' && snapshot.game_config?.answer) {
                    const answer = snapshot.game_config.answer.toUpperCase().replace(/ /g, '');
                    const timeLimit = snapshot.game_time_limit || 90;
                    const numReveals = Math.min(3, Math.floor(answer.length / 3)); // Reveal ~1/3 of letters
                    
                    // Generate random indices to reveal
                    const indicesToReveal = [];
                    const availableIndices = Array.from({length: answer.length}, (_, i) => i);
                    for (let i = 0; i < numReveals; i++) {
                        const randomIdx = Math.floor(Math.random() * availableIndices.length);
                        indicesToReveal.push(availableIndices[randomIdx]);
                        availableIndices.splice(randomIdx, 1);
                    }
                    
                    // Send reveal messages at intervals throughout the game
                    indicesToReveal.forEach((index, i) => {
                        const delayMs = ((timeLimit * 1000) / (numReveals + 1)) * (i + 1);
                        setTimeout(() => {
                            console.log(`🚧 MockWebSocket: Revealing letter at index ${index}`);
                            this.simulateMessage({
                                type: 'word_guess_reveal',
                                revealed_letters: [{
                                    index: index,
                                    letter: answer[index]
                                }]
                            });
                        }, delayMs);
                    });
                }
            }, 200);
            
        } catch (error) {
            console.error('🚧 Failed to load snapshot:', error);
            if (this.onerror) {
                this.onerror(error);
            }
        }
    }
    
    send(data) {
        const message = JSON.parse(data);
        console.log('🚧 MockWebSocket: Would send:', message.action, message.data);
        
        // Simulate some responses based on actions
        setTimeout(() => {
            if (message.action === 'identify') {
                this.simulateMessage({
                    type: 'identified',
                    game_types: ['speed_tap']
                });
            } else if (message.action === 'speed_tap') {
                // Player submitted answer - simulate results after 2 seconds
                console.log('🚧 MockWebSocket: Player answered:', message.data.answer);
                console.log('🚧 MockWebSocket: Will show results in 2 seconds...');
                
                setTimeout(() => {
                    // Load the corresponding results snapshot
                    const currentState = window.DEV_STATE;
                    
                    // If currently showing active game, automatically load results
                    if (currentState.includes('_active')) {
                        console.log('🚧 MockWebSocket: Auto-loading results snapshot');
                        this.loadResultsSnapshot(message.data.answer);
                    }
                }, 2000);
            }
        }, 100);
    }
    
    async loadResultsSnapshot(playerAnswer) {
        try {
            // Determine if answer was correct by checking the active snapshot's correct answer
            // For demo purposes, let's assume "Retention Rate" is correct (from our mock data)
            const correctAnswer = "Retention Rate";
            const isCorrect = playerAnswer === correctAnswer;
            
            const resultsFile = isCorrect 
                ? 'speed_tap_results_correct.json' 
                : 'speed_tap_results_incorrect.json';
            
            console.log(`🚧 Loading results: ${resultsFile}`);
            
            const response = await fetch(`dev_data/snapshots/${resultsFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load results: ${response.status}`);
            }
            
            const results = await response.json();
            
            // Override with player's actual answer
            results.player_answer = playerAnswer;
            results.is_correct = isCorrect;
            
            console.log('🚧 MockWebSocket: Sending results');
            if (this.onmessage) {
                this.onmessage({ data: JSON.stringify(results) });
            }
            
        } catch (error) {
            console.error('🚧 Failed to load results snapshot:', error);
        }
    }
    
    simulateMessage(message) {
        if (this.onmessage) {
            console.log('🚧 MockWebSocket: Simulating message:', message.type);
            this.onmessage({ data: JSON.stringify(message) });
        }
    }
    
    close() {
        console.log('🚧 MockWebSocket: Closing');
        this.readyState = 3; // CLOSED
        if (this.onclose) {
            this.onclose({ wasClean: true });
        }
    }
}

function connectWebSocket() {
    logTiming('wsConnectionStart', Date.now());
    
    // Show initial connecting state
    updateConnectionProgress();
    progressMessageInterval = setInterval(updateConnectionProgress, 1000);
    
    const wsUrl = `${WS_BASE}/ws/game/${roomCode}/?session_id=${playerSession.id}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    // 🚧 DEV MODE: Use MockWebSocket instead of real WebSocket
    if (window.DEV_MODE) {
        console.log('🚧 Using MockWebSocket (dev mode)');
        websocket = new MockWebSocket(wsUrl);
    } else {
        websocket = new WebSocket(wsUrl);
    }
    
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
            
            // Update line fit participation tracker
            if (window.lineFitParticipation && message.players) {
                window.lineFitParticipation.totalPlayers = message.players.length;
                if (typeof updateLineFitParticipation === 'function') {
                    updateLineFitParticipation();
                }
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
            
        case 'line_fit_data':
            // Handle scatter data for Line Fit game
            if (typeof handleLineFitData === 'function') {
                handleLineFitData(message);
            }
            break;
            
        case 'line_fit_submission':
            // Handle line submission from another player
            if (typeof handleLineFitSubmission === 'function') {
                handleLineFitSubmission(message);
            }
            break;
            
        case 'line_fit_player_data':
            // Store player's own line data for use in results display
            if (!window.lineFitPlayerData) {
                window.lineFitPlayerData = {};
            }
            window.lineFitPlayerData = message;
            console.log('[LINE FIT] Received player-specific line data:', message);
            break;
            
        case 'game_results':
            handleUnifiedGameResults(message);
            break;
            
        case 'leaderboard_update':
            console.log('📊 Received leaderboard_update message:', message);
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
        'line_fit': {
            title: '📈 Line Fit',
            description: 'Click two points on the scatter plot to draw a regression line!<br>Lines closest to the data earn the most points. Make it count!'
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
        'line_fit': {
            title: '📈 Line Fit',
            description: 'Click two points on the scatter plot to draw a regression line!<br>Lines closest to the data earn the most points. Make it count!'
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
            const qrSize = window.isProjectorMode ? 270 : 180; // 50% larger for projector
            new QRCode(qrCodeDiv, {
                text: joinUrl,
                width: qrSize,
                height: qrSize,
                colorDark: "#1e293b",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
            
            // Add Praxis Play logo overlay for branding consistency
            setTimeout(() => {
                const logo = document.createElement('img');
                logo.src = '../../art_assets/svg_logos/praxisplay_notext_logo.svg';
                logo.alt = 'Praxis Play';
                const logoSize = window.isProjectorMode ? 57 : 38; // Scale with QR code
                logo.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${logoSize}px; height: ${logoSize}px; background: white; padding: 4px; border-radius: 0; box-shadow: 0 0 0 3px white; pointer-events: none;`;
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
        'word_guess': 'game-word-guess.js',
        'line_fit': 'line-fit.js',
        'live_buzzer': 'game-buzzer.js'
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
    } else if (gameType === 'line_fit') {
        console.log('Checking showLineFitGame:', typeof showLineFitGame);
        if (typeof showLineFitGame === 'function') {
            showLineFitGame(message, timeLimit);
            console.log('Checking startLineFitTimer:', typeof startLineFitTimer);
            if (typeof startLineFitTimer === 'function') {
                startLineFitTimer(timeLimit, startTime);
            } else {
                console.error('❌ startLineFitTimer not found!');
            }
        } else {
            console.error('❌ showLineFitGame not found!');
        }
    } else {
        console.error('❌ Unknown game type:', gameType);
    }
}

async function handleUnifiedGameResults(message) {
    console.log('Game results:', message);
    
    // Make sure current game script is loaded (for dev mode jumping to results)
    if (message.game_type && !loadedGameScripts.has(message.game_type)) {
        console.log('📦 Loading current game script for results:', message.game_type);
        try {
            await loadGameScript(message.game_type);
        } catch (err) {
            console.error('❌ Failed to load current game script:', err);
        }
    }
    
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
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">⚡ Fastest Correct: <span style="font-weight: 700;">${gs.fastest_correct.player_name}</span> (${gs.fastest_correct.response_time?.toFixed(2) || '?'}s)</div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">Correct Answer: <span style="font-weight: 700;">${message.correct_answer}</span></div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">❌ ${gs.incorrect_count} incorrect</span>
                            ${window.isProjectorMode && hasMoreRounds ? `<span style="font-size: 28px; opacity: 0.9; margin-left: 10px;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...</span>
                            <style>
                                @keyframes rotate {
                                    0% { transform: rotate(0deg); }
                                    40% { transform: rotate(180deg); }
                                    50% { transform: rotate(180deg); }
                                    90% { transform: rotate(360deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>` : ''}
                        </div>
                    `;
                }
                // Show dot plot chart if available
                if (typeof showSpeedTapDotPlot === 'function' && gs.chart_data) {
                    gameSpecificHTML += showSpeedTapDotPlot(gs.chart_data);
                } else if (gs.chart_data) {
                    console.log('[SPEED TAP] Chart data available but showSpeedTapDotPlot function not loaded');
                }
            } else if (message.game_type === 'closest_guess') {
                // Closest Guess: Show top scorer with their range
                if (gs.top_scorer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">🎯 Top Scorer: <span style="font-weight: 700;">${gs.top_scorer.name}</span> (${gs.top_scorer.points} pts, range: ${gs.top_scorer.range})</div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">✅ ${gs.correct_count}/${gs.total_guesses} captured answer</span>
                            ${gs.average_range_width ? `<span style="background: rgba(99,102,241,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">📊 Avg range: ${gs.average_range_width.toFixed(1)}</span>` : ''}
                            ${window.isProjectorMode && hasMoreRounds ? `<span style="font-size: 28px; opacity: 0.9; margin-left: 10px;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...</span>
                            <style>
                                @keyframes rotate {
                                    0% { transform: rotate(0deg); }
                                    40% { transform: rotate(180deg); }
                                    50% { transform: rotate(180deg); }
                                    90% { transform: rotate(360deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>` : ''}
                        </div>
                    `;
                }
                // Show chart if available - build from player_stats if chart_data not provided
                console.log('[CLOSEST GUESS DEBUG] Has chart_data?', !!gs.chart_data);
                console.log('[CLOSEST GUESS DEBUG] chart_data:', gs.chart_data);
                
                // Build chart data from round_stats if not provided
                let chartDataToUse = gs.chart_data;
                if (!chartDataToUse && message.round_stats && message.round_stats.player_stats) {
                    const results = [];
                    for (const [playerId, stats] of Object.entries(message.round_stats.player_stats)) {
                        if (stats.answered && stats.range) {
                            const [min, max] = stats.range.split('-').map(Number);
                            results.push({
                                player_name: stats.player_name,
                                guess_min: min,
                                guess_max: max,
                                is_correct: stats.captured_answer
                            });
                        }
                    }
                    if (results.length > 0) {
                        chartDataToUse = {
                            correct_answer: parseFloat(message.correct_answer),
                            results: results
                        };
                    }
                }
                
                // HTML number line rendering for Closest Guess - matching in-game projector style
                if (chartDataToUse && chartDataToUse.results && chartDataToUse.results.length > 0) {
                    const containerId = 'closestGuessResultsContainer_' + Date.now();
                    const correctAnswer = chartDataToUse.correct_answer;
                    const results = chartDataToUse.results;
                    
                    // Calculate range from submitted guesses (for labels)
                    let dataMin = Math.min(...results.map(r => r.guess_min));
                    let dataMax = Math.max(...results.map(r => r.guess_max));
                    
                    // Calculate display range including correct answer (for chart bounds)
                    let displayMin = Math.min(dataMin, correctAnswer);
                    let displayMax = Math.max(dataMax, correctAnswer);
                    
                    // Add 10% padding to display range
                    let displayRange = displayMax - displayMin;
                    if (displayRange === 0) {
                        displayRange = 10;
                        displayMin -= displayRange / 2;
                        displayMax += displayRange / 2;
                    }
                    const padding = displayRange * 0.10;
                    const numberlineMin = Math.floor(displayMin - padding);
                    const numberlineMax = Math.ceil(displayMax + padding);
                    
                    // Calculate positions for min/max labels
                    const minPos = ((dataMin - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    const maxPos = ((dataMax - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    
                    // Calculate position for correct answer marker
                    const answerPos = ((correctAnswer - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    
                    // Calculate average guess (midpoint of each range, then average)
                    const rangeMidpoints = results.map(r => (r.guess_min + r.guess_max) / 2);
                    const averageGuess = rangeMidpoints.reduce((sum, val) => sum + val, 0) / rangeMidpoints.length;
                    const averagePos = ((averageGuess - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    
                    // Responsive sizing based on mode
                    const titleSize = window.isProjectorMode ? '36px' : '20px';
                    const barHeight = window.isProjectorMode ? '220px' : '120px';
                    const containerHeight = window.isProjectorMode ? '480px' : '280px';
                    const lineWidth = window.isProjectorMode ? '10px' : '6px';
                    const greenLineHeight = window.isProjectorMode ? '340px' : '180px';
                    const avgLabelBottom = window.isProjectorMode ? '250px' : '140px';
                    const answerLabelBottom = window.isProjectorMode ? '370px' : '200px';
                    const valueFontSize = window.isProjectorMode ? '40px' : '24px';
                    const labelFontSize = window.isProjectorMode ? '20px' : '14px';
                    const minMaxValueSize = window.isProjectorMode ? '40px' : '24px';
                    const minMaxLabelSize = window.isProjectorMode ? '24px' : '16px';
                    const minMaxBottom = window.isProjectorMode ? '130px' : '70px';
                    
                    // Build range bars HTML
                    let rangeBarsHTML = '';
                    results.forEach(result => {
                        const rangeWidth = ((result.guess_max - result.guess_min) / (numberlineMax - numberlineMin)) * 100;
                        const rangeLeft = ((result.guess_min - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                        rangeBarsHTML += `
                            <div style="position: absolute; left: ${Math.max(0, Math.min(100, rangeLeft))}%; width: ${Math.max(0, Math.min(100, rangeWidth))}%; height: ${barHeight}; bottom: 20px; background: rgba(59, 130, 246, 0.10); border-radius: 6px;"></div>
                        `;
                    });
                    
                    gameSpecificHTML += `
                        <div style="margin: 40px 0;">
                            <div style="font-size: ${titleSize}; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-align: center;">📊 All Player Ranges</div>
                            <div style="min-height: ${containerHeight}; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 40px 20px; position: relative;">
                                ${rangeBarsHTML}
                                <div style="position: absolute; left: ${averagePos}%; bottom: 20px; width: 0; height: ${barHeight}; border-left: ${lineWidth} dotted #000000; transform: translateX(-50%); z-index: 1;"></div>
                                <div style="position: absolute; left: ${averagePos}%; bottom: ${avgLabelBottom}; transform: translateX(-50%); text-align: center; background: white; border-radius: 12px; padding: 8px 15px; z-index: 10;">
                                    <div style="font-size: ${valueFontSize}; font-weight: 700; color: #000000;">${averageGuess.toFixed(1)}</div>
                                    <div style="font-size: ${labelFontSize}; font-weight: 400; color: #000000;">Average Guess</div>
                                </div>
                                <div style="position: absolute; left: ${answerPos}%; bottom: 20px; width: ${lineWidth}; height: ${greenLineHeight}; background: #10b981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); transform: translateX(-50%); z-index: 1;"></div>
                                <div style="position: absolute; left: ${answerPos}%; bottom: ${answerLabelBottom}; transform: translateX(-50%); text-align: center; background: white; border-radius: 12px; padding: 8px 15px; z-index: 10;">
                                    <div style="font-size: ${valueFontSize}; font-weight: 700; color: #10b981;">${correctAnswer}</div>
                                    <div style="font-size: ${labelFontSize}; font-weight: 400; color: #10b981;">Correct Answer</div>
                                </div>
                                <div style="position: absolute; left: ${minPos - 2.5}%; bottom: ${minMaxBottom}; transform: translate(-50%, 50%); text-align: center;">
                                    <div style="font-size: ${minMaxValueSize}; font-weight: 700; color: #1e293b;">${dataMin}</div>
                                    <div style="font-size: ${minMaxLabelSize}; font-weight: 600; color: #64748b;">(min)</div>
                                </div>
                                <div style="position: absolute; left: ${maxPos + 2.5}%; bottom: ${minMaxBottom}; transform: translate(-50%, 50%); text-align: center;">
                                    <div style="font-size: ${minMaxValueSize}; font-weight: 700; color: #1e293b;">${dataMax}</div>
                                    <div style="font-size: ${minMaxLabelSize}; font-weight: 600; color: #64748b;">(max)</div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } else if (message.game_type === 'push_range') {
                // Push Range: Show final range and correct answer
                const fontSize = window.isProjectorMode ? '48px' : '20px';
                const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                const rangeColor = gs.is_correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
                const rangeIcon = gs.is_correct ? '✅' : '❌';
                gameSpecificHTML += `
                    <div style="background: ${rangeColor}; padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: ${fontSize};">${rangeIcon} Final Range: <span style="font-weight: 700;">${gs.final_range}</span> (Answer: ${message.correct_answer}%)</div>
                    </div>
                `;
                if (gs.top_pressers && gs.top_pressers.length > 0) {
                    const topPresser = gs.top_pressers[0];
                    const teamEmoji = topPresser.team === 'left' ? '🔵' : '🔴';
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    const topPresserPoints = topPresser.points || topPresser.presses;
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(255,255,255,0.2); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">🏆 Top Presser: ${teamEmoji} ${topPresser.player_name} (${topPresser.presses} presses) • ${topPresserPoints} pts</span>
                        </div>
                    `;
                }
                // Show chart if available
                console.log('[PUSH RANGE DEBUG] Has chart_data?', !!gs.chart_data);
                console.log('[PUSH RANGE DEBUG] chart_data:', gs.chart_data);
                console.log('[PUSH RANGE DEBUG] showPushRangeResults function exists?', typeof showPushRangeResults === 'function');
                if (typeof showPushRangeResults === 'function' && gs.chart_data) {
                    console.log('[PUSH RANGE DEBUG] Calling showPushRangeResults...');
                    gameSpecificHTML += `<div style="padding-top: 120px;">${showPushRangeResults(gs.chart_data)}</div>`;
                } else if (gs.chart_data) {
                    console.log('[PUSH RANGE] Chart data available but showPushRangeResults function not loaded');
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
                // Show player's result first (points earned/lost)
                if (myStats && myStats.points_earned !== undefined) {
                    const pointsColor = myStats.points_earned > 0 ? '#10b981' : myStats.points_earned < 0 ? '#ef4444' : '#64748b';
                    const pointsPrefix = myStats.points_earned > 0 ? '+' : '';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 15px 20px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                            <div style="color: ${pointsColor}; font-size: 28px; font-weight: 700;">${pointsPrefix}${myStats.points_earned} points</div>
                            ${myStats.got_tough_bonus ? '<div style="color: #f59e0b; margin-top: 5px; font-size: 14px;">🏆 Tough Question Bonus (2x)!</div>' : ''}
                        </div>
                    `;
                }
                
                // Show distribution chart with color coding
                if (gs.final_distribution && Array.isArray(gs.final_distribution)) {
                    const totalAnswered = gs.final_distribution.reduce((sum, opt) => sum + (opt.percent || 0), 0);
                    const percentDidntAnswer = Math.max(0, 100 - totalAnswered);
                    const correctIndex = gs.correct_option_index;
                    
                    gameSpecificHTML += `
                        <div class="distribution-container" style="margin-top: 20px;">
                            <div class="distribution-row unanswered-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px; border-radius: 8px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);">
                                <div class="distribution-label" style="width: 180px; font-weight: 600; color: #64748b;">❌ Didn't Answer</div>
                                <div class="distribution-bar-wrapper" style="flex: 1; height: 24px; background: #e2e8f0; border-radius: 12px; margin: 0 12px; overflow: hidden;">
                                    <div class="distribution-bar" style="height: 100%; width: ${percentDidntAnswer}%; border-radius: 12px; background: linear-gradient(90deg, #ef4444, #f87171);"></div>
                                </div>
                                <div class="distribution-percent" style="width: 50px; text-align: right; font-weight: 700; color: #1e293b;">${Math.round(percentDidntAnswer)}%</div>
                            </div>
                            ${gs.final_distribution.map((opt) => {
                                const isCorrect = opt.option_index === correctIndex;
                                const barColor = isCorrect ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)';
                                const textColor = isCorrect ? '#10b981' : '#ef4444';
                                return `
                                    <div class="distribution-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px; border-radius: 8px; background: #f8fafc;">
                                        <div class="distribution-label" style="width: 180px; font-weight: 600; color: #1e293b;">${opt.text}</div>
                                        <div class="distribution-bar-wrapper" style="flex: 1; height: 24px; background: #e2e8f0; border-radius: 12px; margin: 0 12px; overflow: hidden;">
                                            <div class="distribution-bar" style="height: 100%; width: ${opt.percent || 0}%; border-radius: 12px; background: ${barColor};"></div>
                                        </div>
                                        <div class="distribution-percent" style="width: 50px; text-align: right; font-weight: 700; color: ${textColor};">${Math.round(opt.percent || 0)}%</div>
                                    </div>
                                `;
                            }).join('')}
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
                }
                // Show distribution chart if available
                if (gs.distribution && gs.distribution.length > 0) {
                    gameSpecificHTML += `
                        <div style="margin: 20px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center;">Answer Distribution</div>
                            ${gs.distribution.map(opt => {
                                const barColor = opt.is_correct ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.6)';
                                const textColor = opt.is_correct ? '#10b981' : '#ef4444';
                                const borderColor = opt.is_correct ? '#10b981' : '#ef4444';
                                return `
                                    <div style="margin-bottom: 12px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <span style="font-weight: 600; color: ${textColor};">${opt.text}</span>
                                            <span style="font-weight: 700; color: ${textColor};">${opt.percent}%</span>
                                        </div>
                                        <div style="width: 100%; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; border: 2px solid ${borderColor};">
                                            <div style="width: ${opt.percent}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }            } else if (message.game_type === 'word_guess') {
                // Word Guess: Match Speed Tap results formatting
                if (gs.fastest_correct) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    // Use guess_time from snapshot data
                    const timeValue = gs.fastest_correct.guess_time || gs.fastest_correct.time_remaining || gs.fastest_correct.time || 0;
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">⚡ Fastest Correct: <span style="font-weight: 700;">${gs.fastest_correct.player_name}</span> (${timeValue.toFixed(1)}s)</div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">Correct Answer: <span style="font-weight: 700;">${message.correct_answer.toUpperCase()}</span></div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">❌ ${gs.incorrect_count || 0} incorrect</span>
                            ${window.isProjectorMode && hasMoreRounds ? `<span style="font-size: 28px; opacity: 0.9; margin-left: 10px;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...</span>
                            <style>
                                @keyframes rotate {
                                    0% { transform: rotate(0deg); }
                                    40% { transform: rotate(180deg); }
                                    50% { transform: rotate(180deg); }
                                    90% { transform: rotate(360deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>` : ''}
                        </div>
                    `;
                }            } else if (message.game_type === 'line_fit') {
                // Line Fit: Show scatter plot with true line and all submissions
                console.log('[GAME CORE DEBUG] line_fit results - message.game_specific:', message.game_specific);
                console.log('[GAME CORE DEBUG] game_specific keys:', Object.keys(message.game_specific || {}));
                console.log('[GAME CORE DEBUG] all_submissions:', message.game_specific?.all_submissions);
                console.log('[GAME CORE DEBUG] Full message object:', message);
                
                // Merge player-specific data if available
                if (window.lineFitPlayerData && window.lineFitPlayerData.your_line) {
                    message.game_specific.your_line = window.lineFitPlayerData.your_line;
                    message.game_specific.your_rank = window.lineFitPlayerData.your_rank;
                    message.game_specific.your_points = window.lineFitPlayerData.your_points;
                    console.log('[GAME CORE DEBUG] Merged player line data:', message.game_specific.your_line);
                }
                
                if (typeof showLineFitResults === 'function') {
                    gameSpecificHTML += showLineFitResults(message.game_specific);
                } else {
                    // Fallback text display if function not loaded
                    if (gs.true_line) {
                        gameSpecificHTML += `
                            <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                                <div style="font-size: 14px; opacity: 0.9;">📈 True Regression Line</div>
                                <div style="font-size: 18px; font-weight: 700;">y = ${gs.true_line.slope.toFixed(3)}x + ${gs.true_line.intercept.toFixed(2)}</div>
                                <div style="font-size: 14px; opacity: 0.8;">r = ${gs.correlation?.toFixed(3) || '?'}, R² = ${gs.r_squared?.toFixed(3) || '?'}</div>
                            </div>
                        `;
                    }
                    if (gs.average_sse !== undefined) {
                        gameSpecificHTML += `
                            <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                                <span style="background: rgba(99,102,241,0.3); padding: 8px 16px; border-radius: 20px;">📊 Average SSE: ${gs.average_sse.toFixed(2)}</span>
                                <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.submission_count} submissions</span>
                            </div>
                        `;
                    }
                }
            }
        }
        
        const banner = document.createElement('div');
        banner.id = 'roundCompleteBanner';
        banner.style.cssText = 'margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: white;';
        
        if (hasValidStats) {
            banner.innerHTML = `
                <div style="text-align: center;">
                    <h2 style="color: white; margin: 0 0 15px 0; font-size: ${window.isProjectorMode ? '20px' : '24px'};">
                        🎉 Round ${message.current_round} of ${message.total_rounds} Complete!
                    </h2>
                    ${gameSpecificHTML}
                    ${!window.isProjectorMode ? `
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
                    ` : ''}
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
                    ${hasMoreRounds ? (window.isProjectorMode ? '<div style="margin-top: 25px; font-size: 28px; opacity: 0.9;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...<style>@keyframes rotate { 0% { transform: rotate(0deg); } 40% { transform: rotate(180deg); } 50% { transform: rotate(180deg); } 90% { transform: rotate(360deg); } 100% { transform: rotate(360deg); } }</style></div>' : '<div style="margin-top: 15px; font-size: 16px; opacity: 0.9;">⏳ Waiting for instructor to start next round...</div>') : '<div style="margin-top: 15px; font-size: 18px; font-weight: 600;">🏁 Final Round Complete!</div>'}
                </div>
            `;
        }
        
        // Clear gameArea and insert the results banner
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = '';
        gameArea.appendChild(banner);
        
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
    console.log('🏆 Updating leaderboard with data:', leaderboard);
    latestLeaderboard = leaderboard;
    
    // Render leaderboard list
    const leaderboardList = document.getElementById('leaderboardList');
    if (leaderboardList && leaderboard && leaderboard.length > 0) {
        // Get current player's ID from session
        const playerSessionData = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
        const currentPlayerId = playerSessionData.id;
        
        // Build leaderboard HTML
        let html = '';
        leaderboard.forEach((player, index) => {
            const rank = index + 1;
            // Support both backend format (name, player_id) and dev mode format (player_name, player_id)
            const playerName = player.player_name || player.name || 'Unknown';
            const playerId = player.player_id;
            const isOwnPlayer = playerId === currentPlayerId;
            const rankClass = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : '';
            const itemClass = isOwnPlayer ? 'leaderboard-item own' : 'leaderboard-item';
            
            html += `
                <div class="${itemClass}">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div class="rank ${rankClass}">${rank}</div>
                        <div>${playerName}</div>
                    </div>
                    <div style="font-weight: 700; font-size: 1.1rem;">${player.score}</div>
                </div>
            `;
        });
        
        leaderboardList.innerHTML = html;
    }
    
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

// ========== CHART RENDERING FUNCTIONS ==========
// These need to be in game-core.js so they're always available for end-of-round results
// Note: showPushRangeResults is now in game-push-range.js and returns HTML

function showClosestGuessResults(chartData) {
    console.log('[CLOSEST GUESS CHART] showClosestGuessResults called with:', chartData);
    if (!chartData) {
        console.log('[CLOSEST GUESS CHART] No chart data, returning empty string');
        return '';
    }
    
    // Create canvas for the chart
    const canvasId = 'closestGuessResultsCanvas_' + Date.now();
    console.log('[CLOSEST GUESS CHART] Created canvas ID:', canvasId);
    console.log('[CLOSEST GUESS CHART] Setting timeout to draw chart...');
    setTimeout(() => {
        console.log('[CLOSEST GUESS CHART] Timeout fired, calling draw function');
        drawClosestGuessResultsCanvas(canvasId, chartData);
    }, 100);
    
    return `
        <div style="margin: 20px 0;">
            <canvas id="${canvasId}" width="800" height="300" style="max-width: 100%; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></canvas>
        </div>
    `;
}

function drawClosestGuessResultsCanvas(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.log('[CLOSEST GUESS CHART] Canvas not found:', canvasId);
        return;
    }
    
    console.log('[CLOSEST GUESS CHART] Drawing chart with data:', chartData);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Determine range from data
    const playerRanges = chartData.results || chartData.player_ranges || [];
    const correctAnswer = chartData.correct_answer;
    
    if (playerRanges.length === 0) {
        console.log('[CLOSEST GUESS CHART] No player ranges to display');
        return;
    }
    
    // Support both field name formats: guess_min/guess_max or min/max
    let minVal = Math.min(...playerRanges.map(r => r.guess_min || r.min));
    let maxVal = Math.max(...playerRanges.map(r => r.guess_max || r.max));
    
    // Expand range to include correct answer
    if (correctAnswer !== undefined && correctAnswer !== null) {
        minVal = Math.min(minVal, correctAnswer);
        maxVal = Math.max(maxVal, correctAnswer);
    }
    
    // Add padding
    const range = maxVal - minVal;
    minVal -= range * 0.1;
    maxVal += range * 0.1;
    
    // Draw axis
    const margin = 60;
    const axisY = height - 50;
    const chartWidth = width - 2 * margin;
    
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, axisY);
    ctx.lineTo(width - margin, axisY);
    ctx.stroke();
    
    // Draw player ranges as horizontal bars
    const barHeight = Math.min(30, (height - 100) / playerRanges.length);
    playerRanges.forEach((range, idx) => {
        const rangeMin = range.guess_min || range.min;
        const rangeMax = range.guess_max || range.max;
        
        const x1 = margin + ((rangeMin - minVal) / (maxVal - minVal)) * chartWidth;
        const x2 = margin + ((rangeMax - minVal) / (maxVal - minVal)) * chartWidth;
        const y = 30 + idx * (barHeight + 5);
        
        // Draw bar
        ctx.fillStyle = range.is_correct ? 'rgba(16, 185, 129, 0.5)' : 'rgba(148, 163, 184, 0.4)';
        ctx.fillRect(x1, y, x2 - x1, barHeight);
        
        // Draw border
        ctx.strokeStyle = range.is_correct ? '#10b981' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y, x2 - x1, barHeight);
        
        // Draw player name
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(range.player_name.substring(0, 15), margin - 5, y + barHeight / 2 + 4);
    });
    
    // Draw correct answer line
    if (correctAnswer !== undefined && correctAnswer !== null) {
        const answerX = margin + ((correctAnswer - minVal) / (maxVal - minVal)) * chartWidth;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(answerX, 20);
        ctx.lineTo(answerX, axisY);
        ctx.stroke();
        
        // Answer label
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Answer: ${correctAnswer}`, answerX, 15);
    }
    
    // Draw scale labels
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
        const val = minVal + (i / labelCount) * (maxVal - minVal);
        const x = margin + (i / labelCount) * chartWidth;
        ctx.fillText(val.toFixed(1), x, axisY + 20);
    }
    
    console.log('[CLOSEST GUESS CHART] Chart drawn successfully');
}

function showSpeedTapDotPlot(chartData) {
    if (!chartData || !chartData.all_responses) return '';
    
    // Create canvas for the dot plot
    const canvasId = 'speedTapDotPlot_' + Date.now();
    setTimeout(() => drawSpeedTapDotPlot(canvasId, chartData), 100);
    
    return `
        <div style="margin: 20px 0;">
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px; text-align: center;">Response Time Distribution</div>
            <canvas id="${canvasId}" width="800" height="300" style="max-width: 100%; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></canvas>
        </div>
    `;
}

function drawSpeedTapDotPlot(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.log('[SPEED TAP DOT PLOT] Canvas not found:', canvasId);
        return;
    }
    
    console.log('[SPEED TAP DOT PLOT] Drawing chart with data:', chartData);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    const allResponses = chartData.all_responses || [];
    const nonResponders = chartData.non_responders || [];
    const gameTimeLimit = chartData.game_time_limit || 20;
    
    // Chart dimensions
    const margin = 60;
    const chartWidth = width - 2 * margin - 100; // Extra space on right for non-responder pile
    const chartHeight = height - 100;
    const axisY = height - 40;
    const dotRadius = 5;
    
    // Draw axis
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, axisY);
    ctx.lineTo(margin + chartWidth, axisY);
    ctx.stroke();
    
    // Draw time labels (0s, middle, max)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    const midTime = gameTimeLimit / 2;
    ctx.fillText('0s', margin, axisY + 30);
    ctx.fillText(`${midTime}s`, margin + chartWidth / 2, axisY + 30);
    ctx.fillText(`${gameTimeLimit}s`, margin + chartWidth, axisY + 30);
    
    // Organize responses into time slots (20 bins)
    const numBins = 20;
    const binWidth = gameTimeLimit / numBins;
    const bins = Array.from({ length: numBins }, () => ({ correct: [], incorrect: [] }));
    
    // Place each response into a bin
    allResponses.forEach(resp => {
        const timeSeconds = resp.response_time_ms / 1000;
        let binIndex = Math.floor(timeSeconds / binWidth);
        
        // Clamp to last bin if exactly at max time
        if (binIndex >= numBins) binIndex = numBins - 1;
        if (binIndex < 0) binIndex = 0;
        
        if (resp.is_correct) {
            bins[binIndex].correct.push(resp);
        } else {
            bins[binIndex].incorrect.push(resp);
        }
    });
    
    // Draw dots - stack vertically within each bin
    bins.forEach((bin, binIndex) => {
        const binCenterX = margin + (binIndex + 0.5) * (chartWidth / numBins);
        
        // Draw incorrect (red) dots first
        bin.incorrect.forEach((resp, stackIndex) => {
            const dotY = axisY - (stackIndex + 1) * (dotRadius * 2 + 2);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(binCenterX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw correct (green) dots on top
        const incorrectHeight = bin.incorrect.length;
        bin.correct.forEach((resp, stackIndex) => {
            const dotY = axisY - (incorrectHeight + stackIndex + 1) * (dotRadius * 2 + 2);
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(binCenterX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    
    // Draw non-responders as gray dots in a pile on the right
    if (nonResponders.length > 0) {
        const pileX = margin + chartWidth + 50;
        const pileStartY = axisY;
        
        // Label for non-responders
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No Answer', pileX, axisY + 30);
        
        // Stack gray dots
        nonResponders.forEach((player, index) => {
            const dotY = pileStartY - (index + 1) * (dotRadius * 2 + 2);
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(pileX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Legend
    const legendY = 20;
    const legendX = margin;
    
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    
    // Green dot + label
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(legendX, legendY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Correct', legendX + 15, legendY + 4);
    
    // Red dot + label
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(legendX + 80, legendY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Incorrect', legendX + 95, legendY + 4);
    
    // Gray dot + label
    if (nonResponders.length > 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(legendX + 180, legendY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillText('No Answer', legendX + 195, legendY + 4);
    }
    
    console.log('[SPEED TAP DOT PLOT] Chart drawn successfully');
}

// ===== Closest Guess Results Chart =====
function showClosestGuessResults(chartData) {
    console.log('[CLOSEST GUESS CHART] showClosestGuessResults called with:', chartData);
    if (!chartData || !chartData.results || chartData.results.length === 0) {
        console.log('[CLOSEST GUESS CHART] No chart data, returning empty string');
        return '';
    }
    
    const canvasId = 'closestGuessResultsCanvas_' + Date.now();
    console.log('[CLOSEST GUESS CHART] Created canvas ID:', canvasId);
    console.log('[CLOSEST GUESS CHART] Setting timeout to draw chart...');
    
    setTimeout(() => {
        console.log('[CLOSEST GUESS CHART] Timeout fired, calling draw function');
        drawClosestGuessResultsCanvas(canvasId, chartData);
    }, 100);
    
    return `
        <div style="margin-top: 20px;">
            <canvas id="${canvasId}" width="800" height="400" style="max-width: 100%; height: auto; background: white; border-radius: 8px;"></canvas>
        </div>
    `;
}

function drawClosestGuessResultsCanvas(canvasId, chartData) {
    console.log('[CLOSEST GUESS CHART] drawClosestGuessResultsCanvas called');
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('[CLOSEST GUESS CHART] Canvas not found:', canvasId);
        return;
    }
    console.log('[CLOSEST GUESS CHART] Canvas found, drawing...');
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const correctAnswer = chartData.correct_answer;
    const results = chartData.results;
    
    // Calculate range for visualization
    let minVal = correctAnswer;
    let maxVal = correctAnswer;
    
    results.forEach(r => {
        const min = r.guess_min !== undefined ? r.guess_min : r.min;  // Support both field names
        const max = r.guess_max !== undefined ? r.guess_max : r.max;
        if (min < minVal) minVal = min;
        if (max > maxVal) maxVal = max;
    });
    
    // Add padding
    const range = maxVal - minVal;
    const padding = range * 0.1 || 10;
    minVal -= padding;
    maxVal += padding;
    
    const margin = 60;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    const barHeight = Math.min(30, (chartHeight - 60) / results.length);
    const startY = 80;
    
    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Player Guess Ranges vs Correct Answer', width / 2, 30);
    
    // Draw each player's range
    results.forEach((result, index) => {
        const y = startY + index * (barHeight + 10);
        
        const min = result.guess_min !== undefined ? result.guess_min : result.min;
        const max = result.guess_max !== undefined ? result.guess_max : result.max;
        
        // Calculate positions
        const minX = margin + ((min - minVal) / (maxVal - minVal)) * chartWidth;
        const maxX = margin + ((max - minVal) / (maxVal - minVal)) * chartWidth;
        const rangeWidth = maxX - minX;
        
        // Color: green if correct, red if not
        const color = result.is_correct ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)';
        const borderColor = result.is_correct ? '#10b981' : '#ef4444';
        
        // Draw range bar
        ctx.fillStyle = color;
        ctx.fillRect(minX, y, rangeWidth, barHeight);
        
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(minX, y, rangeWidth, barHeight);
        
        // Player name
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(result.player_name, margin - 10, y + barHeight / 2 + 4);
        
        // Range values
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Arial';
        const icon = result.is_correct ? '✓' : '';
        ctx.fillText(`${icon} ${min}-${max}`, minX + rangeWidth / 2, y + barHeight / 2 + 4);
    });
    
    // Draw correct answer line
    const answerX = margin + ((correctAnswer - minVal) / (maxVal - minVal)) * chartWidth;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(answerX, startY - 20);
    ctx.lineTo(answerX, startY + results.length * (barHeight + 10));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Answer label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Correct: ${correctAnswer}`, answerX, startY - 30);
    
    // X-axis scale
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial';
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
        const val = minVal + (i / numTicks) * (maxVal - minVal);
        const x = margin + (i / numTicks) * chartWidth;
        ctx.textAlign = 'center';
        ctx.fillText(val.toFixed(1), x, height - 20);
    }
    
    console.log('[CLOSEST GUESS CHART] Chart drawn successfully');
}
