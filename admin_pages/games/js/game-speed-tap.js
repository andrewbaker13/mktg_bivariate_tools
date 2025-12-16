/**
 * Speed Tap Game Module
 * Handles the Speed Tap game mode logic
 */

function showSpeedTapGame(message, timeLimit) {
    // Use actual options from server if provided, otherwise fallback to A/B/C/D
    console.log('=== showSpeedTapGame DEBUG ===');
    console.log('message object:', message);
    console.log('message.options:', message.options);
    console.log('message.game_config:', message.game_config);
    
    let options = message.options || [];
    
    // If options not at top level, try game_config
    if (!options.length && message.game_config && message.game_config.options) {
        console.log('Options found in game_config');
        options = message.game_config.options;
    }
    
    if (!options.length) {
        console.warn('WARNING: No options found in message, using fallback A/B/C/D');
        // Fallback for legacy/demo questions
        options = [
            {id: 'A', text: 'A'},
            {id: 'B', text: 'B'},
            {id: 'C', text: 'C'},
            {id: 'D', text: 'D'}
        ];
    }
    
    console.log('Final options array:', options);
    
    const imageHTML = message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: 100%; max-height: 25vh; margin: 0.5rem auto; border-radius: 8px; display: block; object-fit: contain;">` : '';
    
    // Projector mode: show participation instead of interactive buttons
    if (window.isProjectorMode) {
        // Reset participation tracking for new question
        if (window.speedTapParticipation) {
            window.speedTapParticipation.respondedPlayers = new Set();
        }
        
        document.getElementById('gameArea').innerHTML = `
            <div class="speed-tap-area">
                <div class="question-display">
                    <div class="question-text" style="font-size: 48px; margin-bottom: 20px;">${message.question_text}</div>
                    ${imageHTML}
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; text-align: center; margin: 20px 0;">${timeLimit}</div>
                </div>
                <div class="answer-options" id="answerOptions" style="pointer-events: none; opacity: 0.9;">
                    ${options.map(opt => `
                        <button class="answer-btn" data-answer="${opt.text}" style="font-size: 36px; padding: 30px; min-height: 100px;">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
                <div id="speedTapParticipation" style="margin-top: 40px; text-align: center; background: #f8fafc; padding: 30px; border-radius: 16px;">
                    <div style="font-size: 48px; font-weight: 700; color: #64748b; margin: 20px 0;">
                        0 / ${window.speedTapParticipation?.totalPlayers || '?'} Players Responded
                    </div>
                    <div style="font-size: 64px; font-weight: 800; color: #1e293b;">
                        0%
                    </div>
                </div>
            </div>
        `;
        
        // Initialize participation display
        if (window.updateSpeedTapParticipation) {
            setTimeout(() => window.updateSpeedTapParticipation(), 100);
        }
        return;
    }
    
    document.getElementById('gameArea').innerHTML = `
        <div class="speed-tap-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${imageHTML}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <div class="timer" id="timer">${timeLimit}</div>
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;" id="availablePoints">100 pts</div>
                </div>
            </div>
            <div class="answer-options" id="answerOptions">
                ${options.map(opt => `
                    <button class="answer-btn" data-answer="${opt.text}" onclick="submitSpeedTap('${opt.text.replace(/'/g, "\\'")}')">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
            <div id="feedback" style="margin-top: 20px; font-size: 18px; color: #64748b; font-weight: 500; min-height: 30px;"></div>
        </div>
    `;
}

function submitSpeedTap(answer) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    websocket.send(JSON.stringify({
        action: 'speed_tap',
        data: {
            player_session_id: playerSession.id,
            answer: answer,
            timestamp: Date.now() / 1000
        }
    }));
    // Highlight selected answer and grey out others
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        if (btn.dataset.answer === answer) {
            btn.classList.add('selected');
        } else {
            btn.classList.add('unselected');
        }
    });
    // No feedback yet
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = '⏳ Waiting for round to end...';
    }
}

function handleSpeedTapAnswer(message) {
    // At round end, reveal correctness for all
    const correctAnswer = message.correct_answer;
    const playerAnswer = message.player_answer;
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected', 'unselected', 'correct', 'incorrect');
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        if (btn.dataset.answer === correctAnswer) {
            btn.classList.add('correct');
            btn.style.borderWidth = '6px';
            btn.innerHTML = `<span style='font-size:2rem; color:#10b981;'>✔️</span> ` + btn.textContent;
        }
        if (btn.dataset.answer === playerAnswer && playerAnswer !== correctAnswer) {
            btn.classList.add('incorrect');
            btn.innerHTML = `<span style='font-size:2rem; color:#ef4444;'>❌</span> ` + btn.textContent;
        }
    });
    // Show feedback
    const feedback = document.getElementById('feedback');
    if (feedback) {
        if (playerAnswer === correctAnswer) {
            feedback.innerHTML = `<div class='alert alert-success'>✅ Correct! +${message.points} points <span class='multiplier-badge'>${message.multiplier}x</span></div>`;
        } else {
            feedback.innerHTML = `<div class='alert alert-error'>❌ Incorrect. The correct answer was <strong>${correctAnswer}</strong>.</div>`;
        }
    }
}

function startSpeedTapTimer(seconds, startTime) {
    // Clear any existing timer first to prevent double-counting
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerEl = document.getElementById('timer');
    const pointsEl = document.getElementById('availablePoints');
    const endTime = startTime + (seconds * 1000);
    
    const maxPoints = 100;
    const gracePeriod = 2; // First 2 seconds, full points
    const decayPeriod = seconds - gracePeriod; // Remaining time for decay
    const minPoints = 10; // Minimum points at the end
    const pointsDecayPerSecond = (maxPoints - minPoints) / decayPeriod;
    
    function updatePoints(remaining) {
        let availablePoints;
        if (remaining > (seconds - gracePeriod)) {
            // Grace period - full points
            availablePoints = maxPoints;
        } else {
            // Decay period
            const timeIntoDecay = (seconds - gracePeriod) - remaining;
            availablePoints = Math.max(minPoints, Math.round(maxPoints - (pointsDecayPerSecond * timeIntoDecay)));
        }
        
        if (pointsEl) {
            pointsEl.textContent = `${availablePoints} pts`;
            
            // Color coding based on points remaining
            if (availablePoints >= 80) {
                pointsEl.style.color = '#10b981'; // Green
            } else if (availablePoints >= 50) {
                pointsEl.style.color = '#f59e0b'; // Orange
            } else {
                pointsEl.style.color = '#ef4444'; // Red
            }
        }
    }
    
    // Update function that calculates remaining time from backend timestamp
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
        
        updatePoints(remaining);
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            
            // Disable all inputs universally
            disableAllInputs();
            
            // End Speed Tap game with no winner if time runs out
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'speed_tap_timeout',
                    data: {
                        player_session_id: playerSession.id
                    }
                }));
            }
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every 100ms for smooth countdown (not affected by tab throttling)
    timerInterval = setInterval(updateTimer, 100);
}
