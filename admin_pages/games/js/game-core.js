/**
 * Game Core
 * Handles WebSocket connection, message routing, and global game state
 */

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
                role: 'player'
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
            break;
            
        case 'player_list_update':
            console.log('Players updated:', message.players);
            break;
            
        case 'countdown_start':
            handleCountdownStart(message);
            break;
            
        case 'game_started':
            handleGameStart(message);
            break;
            
        case 'speed_tap_answer':
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
    
    const helper = gameTypeFromServer && gameTypeHelpers[gameTypeFromServer] ? gameTypeHelpers[gameTypeFromServer] : null;
    
    const gameExplanationHTML = helper ? `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin: 2rem auto; max-width: 500px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            <div style="font-size: 2rem; margin-bottom: 1rem;">${helper.title}</div>
            <div style="font-size: 1.1rem; line-height: 1.6;">${helper.description}</div>
        </div>
    ` : '';
    
    // Check if player joined mid-round and is waiting
    if (isWaitingToEnter) {
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>⏸️ Waiting to Join...</h2>
                <div class="spinner"></div>
                <p style="color: #f59e0b; font-weight: 600;">You joined during an active round.</p>
                <p style="color: #64748b;">You'll be able to participate when the next round begins!</p>
                ${gameExplanationHTML}
                <div class="qr-code-box">
                    <h3>📱 Share with Classmates</h3>
                    <div id="qrcode"></div>
                    <p>Scan this QR code to join the game!</p>
                </div>
            </div>
        `;
    } else {
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>⏳ Waiting for game to start...</h2>
                <div class="spinner"></div>
                <p style="color: #64748b;">Your instructor will start the game soon</p>
                ${gameExplanationHTML}
                <div class="qr-code-box">
                    <h3>📱 Share with Classmates</h3>
                    <div id="qrcode"></div>
                    <p>Scan this QR code to join the game!</p>
                </div>
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
        }
    }, 100);
}

// Handle countdown event from WebSocket
async function handleCountdownStart(message) {
    const overlay = document.getElementById('countdownOverlay');
    const numberDiv = document.getElementById('countdownNumber');
    const roundInfo = document.getElementById('countdownRoundInfo');
    
    // Show overlay
    overlay.style.display = 'flex';
    roundInfo.textContent = `Round ${message.current_round} of ${message.total_rounds}`;
    
    // Countdown: 3, 2, 1
    for (let count = 3; count >= 1; count--) {
        numberDiv.textContent = count;
        numberDiv.style.color = '#3b82f6';
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Show GO!
    numberDiv.textContent = 'GO!';
    numberDiv.style.color = '#10b981';
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hide overlay
    overlay.style.display = 'none';
    
    // Now trigger the actual game start with embedded game data
    if (message.game_data) {
        handleGameStart(message.game_data);
    }
}

function handleGameStart(message) {
    gameType = message.game_type;
    gameStartTime = Date.now();
    
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
    
    const startTime = message.start_time ? new Date(message.start_time).getTime() : Date.now();
    
    console.log('Calculated timeLimit:', timeLimit, 'seconds');
    
    if (gameType === 'speed_tap' && typeof showSpeedTapGame === 'function') {
        showSpeedTapGame(message, timeLimit);
        startSpeedTapTimer(timeLimit, startTime);
    } else if (gameType === 'closest_guess' && typeof showClosestGuessGame === 'function') {
        showClosestGuessGame(message, timeLimit);
        startTimer(timeLimit, startTime);
    } else if (gameType === 'push_range' && typeof showPushRangeGame === 'function') {
        showPushRangeGame(message, timeLimit);
        startPushRangeTimer(timeLimit, startTime);
    } else if (gameType === 'crowd_wisdom' && typeof showCrowdWisdomGame === 'function') {
        showCrowdWisdomGame(message, timeLimit);
        startCrowdWisdomTimer(timeLimit, startTime);
    } else if (gameType === 'word_guess' && typeof showWordGuessGame === 'function') {
        showWordGuessGame(message, timeLimit);
        startWordGuessTimer(timeLimit, startTime);
    } else {
        console.error('Unknown game type or missing handler:', gameType);
    }
}

function handleUnifiedGameResults(message) {
    console.log('Game results:', message);
    
    // Determine if this is the final round
    const isFinalRound = message.current_round >= message.total_rounds;
    const hasMoreRounds = !isFinalRound;
    
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
                if (gs.correct_count !== undefined) {
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: 8px 16px; border-radius: 20px;">❌ ${gs.incorrect_count} incorrect</span>
                            <span style="background: rgba(148,163,184,0.3); padding: 8px 16px; border-radius: 20px;">⏰ ${gs.no_answer_count} no answer</span>
                        </div>
                    `;
                }
            }
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
    
    // Use the stored leaderboard instead of message.leaderboard
    const leaderboard = latestLeaderboard || [];
    const shouldShowLeaderboard = leaderboardVisibility === 'always_show' && leaderboard.length > 0;
    
    // Find player's position and stats
    const myPosition = leaderboard.length > 0 ? leaderboard.findIndex(p => 
        p.player_id === playerSession.id || p.player_name === playerSession.display_name
    ) : -1;
    
    const myStats = message.round_stats?.player_stats?.[playerSession.id] || {
        player_total_score: playerSession.score || 0
    };
    
    let leaderboardHTML = '';
    if (shouldShowLeaderboard) {
        leaderboardHTML = `
            <div class="leaderboard-preview" style="margin-top: 20px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
                <h3 style="margin-bottom: 10px; color: white;">🏆 Final Leaderboard</h3>
                ${leaderboard.slice(0, 5).map((p, i) => `
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>#${i+1} ${p.player_name}</span>
                        <span style="font-weight: bold;">${p.score} pts</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    gameArea.innerHTML = `
        <div class="results-display" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white;">
            <div style="font-size: 64px; margin-bottom: 20px;">🏁</div>
            <h2 style="font-size: 32px; margin-bottom: 10px;">Game Complete!</h2>
            <p style="color: #94a3b8; font-size: 18px;">Thanks for playing!</p>
            
            <div style="margin: 30px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                <div style="font-size: 16px; color: #94a3b8; margin-bottom: 5px;">Your Final Score</div>
                <div style="font-size: 48px; font-weight: 800; color: #3b82f6;">${myStats.player_total_score}</div>
                ${myPosition !== -1 ? `<div style="font-size: 18px; color: #10b981; margin-top: 5px;">Rank #${myPosition + 1}</div>` : ''}
            </div>
            
            ${leaderboardHTML}
            
            <button onclick="location.reload()" style="margin-top: 30px; background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;">
                🔄 Play Again
            </button>
        </div>
    `;
}

function updateLeaderboard(leaderboard) {
    latestLeaderboard = leaderboard;
    // We don't display the leaderboard in the game area during gameplay
    // It's shown in the results screen or separate leaderboard view
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
    // Show waiting state for next round
    showWaitingState(message.game_type);
}

function handleError(message) {
    console.error('Game error:', message);
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = `<div class="alert alert-danger">${message.message}</div>`;
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
    
    // Update every 100ms for smooth countdown (not affected by tab throttling)
    timerInterval = setInterval(updateTimer, 100);
}

// Initialize connection when script loads
// Note: This should be called after all scripts are loaded
document.addEventListener('DOMContentLoaded', () => {
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
