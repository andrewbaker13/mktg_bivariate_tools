/**
 * Closest Guess Game Module
 * Handles the Closest Guess game mode logic
 */

function showClosestGuessGame(message, timeLimit) {
    // Reset guess tracking for new game
    submittedGuesses = [];
    
    // Parse game_config if it's a string
    let gameConfig = message.game_config;
    if (typeof gameConfig === 'string') {
        try {
            gameConfig = JSON.parse(gameConfig);
        } catch (e) {
            console.error('Failed to parse game_config:', e);
            gameConfig = {};
        }
    }
    
    // Determine number line range from game config
    if (gameConfig && gameConfig.numberline_min !== undefined) {
        numberlineMin = gameConfig.numberline_min;
        numberlineMax = gameConfig.numberline_max;
        initialNumberlineMin = numberlineMin;
        initialNumberlineMax = numberlineMax;
    } else {
        // Default range if not specified
        numberlineMin = 0;
        numberlineMax = 100;
        initialNumberlineMin = 0;
        initialNumberlineMax = 100;
    }
    
    console.log('Initial number line range:', numberlineMin, '-', numberlineMax);
    
    const maxWidth = gameConfig?.max_range_width;
    const rangeRequirementText = maxWidth ? `<div style="color: #64748b; font-size: 14px; margin-top: 8px;">📏 Guesses must be within ${maxWidth} units</div>` : '<div style="color: #64748b; font-size: 14px; margin-top: 8px;">📏 Any range allowed (max 8 digits per number)</div>';
    const imageHTML = message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: 100%; max-height: 25vh; margin: 0.5rem auto; border-radius: 8px; display: block; object-fit: contain;">` : '';
    
    document.getElementById('gameArea').innerHTML = `
        <div class="closest-guess-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${rangeRequirementText}
                ${imageHTML}
                <div class="timer" id="timer">${timeLimit}</div>
            </div>
            
            <div class="range-inputs">
                <div class="range-input-group">
                    <label>Minimum</label>
                    <input type="number" id="guessMin" step="0.1">
                </div>
                <div class="range-separator">to</div>
                <div class="range-input-group">
                    <label>Maximum</label>
                    <input type="number" id="guessMax" step="0.1">
                </div>
            </div>
            
            <button class="submit-guess-btn" onclick="submitGuess()">
                Submit Range
            </button>
            
            <div id="feedback"></div>
            
            <div class="numberline-container">
                <div class="numberline-title">📊 All Player Ranges (Real-time)</div>
                <div class="numberline" id="numberline">
                    <div class="numberline-axis"></div>
                </div>
                <div class="numberline-labels">
                    <span>${numberlineMin}</span>
                    <span>${numberlineMax}</span>
                </div>
            </div>
        </div>
    `;
}

function submitGuess() {
    console.log('submitGuess() called');
    const guessMin = parseFloat(document.getElementById('guessMin').value);
    const guessMax = parseFloat(document.getElementById('guessMax').value);
    
    console.log('Parsed values:', guessMin, guessMax);
    
    if (isNaN(guessMin) || isNaN(guessMax)) {
        alert('Please enter valid numbers');
        return;
    }
    
    if (guessMin >= guessMax) {
        alert('Minimum must be less than maximum');
        return;
    }
    
    console.log('WebSocket state:', websocket ? websocket.readyState : 'null');
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not open!');
        return;
    }
    
    const message = {
        action: 'submit_guess',
        data: {
            player_session_id: playerSession.id,
            guess_min: guessMin,
            guess_max: guessMax,
            timestamp: Date.now() / 1000
        }
    };
    
    console.log('Sending WebSocket message:', message);
    websocket.send(JSON.stringify(message));
}

function handleRangeSubmitted(message) {
    const feedback = document.getElementById('feedback');
    const numberline = document.getElementById('numberline');
    
    console.log('handleRangeSubmitted called:', message);
    
    // Track this guess
    submittedGuesses.push({
        min: message.guess_min,
        max: message.guess_max,
        player_id: message.player_id
    });
    
    // Calculate dynamic range with 25% padding
    updateDynamicRange();
    
    console.log('Updated number line range:', numberlineMin, '-', numberlineMax);
    
    if (message.player_id === playerSession.id) {
        feedback.innerHTML = `
            <div class="alert alert-success">
                ✅ Range submitted! You were #${message.submission_order}
            </div>
        `;
        
        // Disable inputs after successful submission
        document.getElementById('guessMin').disabled = true;
        document.getElementById('guessMax').disabled = true;
        document.querySelector('.submit-guess-btn').disabled = true;
    }
    
    // Redraw all range boxes with new scale
    redrawNumberline();
}

function updateDynamicRange() {
    if (submittedGuesses.length === 0) return;
    
    // Find min and max across all guesses
    let dataMin = Math.min(...submittedGuesses.map(g => g.min));
    let dataMax = Math.max(...submittedGuesses.map(g => g.max));
    
    // Add 25% padding
    const range = dataMax - dataMin;
    const padding = range * 0.25;
    
    numberlineMin = Math.floor(dataMin - padding);
    numberlineMax = Math.ceil(dataMax + padding);
    
    // Update labels
    const labels = document.querySelector('.numberline-labels');
    if (labels) {
        labels.innerHTML = `
            <span>${numberlineMin}</span>
            <span style="font-size: 12px; color: #64748b;">(Range: ${numberlineMin} to ${numberlineMax})</span>
            <span>${numberlineMax}</span>
        `;
    }
}

function redrawNumberline() {
    const numberline = document.getElementById('numberline');
    if (!numberline) return;
    
    // Clear existing range boxes (keep axis)
    const rangeBoxes = numberline.querySelectorAll('.range-box');
    rangeBoxes.forEach(box => box.remove());
    
    // Redraw all submitted guesses with new scale
    submittedGuesses.forEach(guess => {
        const rangeWidth = ((guess.max - guess.min) / (numberlineMax - numberlineMin)) * 100;
        const rangeLeft = ((guess.min - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
        
        const rangeBox = document.createElement('div');
        rangeBox.className = 'range-box' + (guess.player_id === playerSession.id ? ' own' : '');
        rangeBox.style.left = Math.max(0, Math.min(100, rangeLeft)) + '%';
        rangeBox.style.width = Math.max(0, Math.min(100, rangeWidth)) + '%';
        numberline.appendChild(rangeBox);
    });
}

function handleGuessResults(message) {
    const feedback = document.getElementById('feedback');
    const numberline = document.getElementById('numberline');
    
    // Hide inputs and submit button to clean up the UI
    const rangeInputs = document.querySelector('.range-inputs');
    const submitBtn = document.querySelector('.submit-guess-btn');
    if (rangeInputs) rangeInputs.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'none';
    
    // Check if correct answer is outside current range and expand if needed
    if (message.correct_answer < numberlineMin || message.correct_answer > numberlineMax) {
        console.log('Correct answer outside range, expanding...');
        
        if (message.correct_answer < numberlineMin) {
            const diff = numberlineMin - message.correct_answer;
            numberlineMin = Math.floor(message.correct_answer - (diff * 0.1));
        }
        if (message.correct_answer > numberlineMax) {
            const diff = message.correct_answer - numberlineMax;
            numberlineMax = Math.ceil(message.correct_answer + (diff * 0.1));
        }
        
        // Update labels
        const labels = document.querySelector('.numberline-labels');
        if (labels) {
            labels.innerHTML = `
                <span>${numberlineMin}</span>
                <span style="font-size: 12px; color: #64748b;">(Range: ${numberlineMin} to ${numberlineMax})</span>
                <span>${numberlineMax}</span>
            `;
        }
        
        // Redraw with new scale
        redrawNumberline();
    }
    
    // Add correct answer marker - bold vertical line in dark green
    const correctPos = ((message.correct_answer - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
    const marker = document.createElement('div');
    marker.className = 'correct-answer-marker';
    marker.style.position = 'absolute';
    marker.style.left = correctPos + '%';
    marker.style.top = '-10px';
    marker.style.bottom = '-10px';
    marker.style.width = '4px';
    marker.style.backgroundColor = '#15803d';
    marker.style.zIndex = '20';
    marker.title = `Correct Answer: ${message.correct_answer}`;
    numberline.appendChild(marker);
    
    // Find this player's result
    const myResult = message.results.find(r => r.player_id === playerSession.id);
    
    if (myResult) {
        const resultIcon = myResult.is_correct ? '✅' : '❌';
        const resultText = myResult.is_correct ? 'CORRECT!' : 'INCORRECT';
        const pointsText = myResult.is_correct 
            ? `+${myResult.total_points} points (Base: ${myResult.base_points}, Time Bonus: ${myResult.time_bonus}, Width Bonus: ${myResult.width_bonus})`
            : '0 points - Your range did not contain the correct answer';
        
        feedback.innerHTML = `
            <div class="alert alert-${myResult.is_correct ? 'success' : 'danger'}">
                <h3>${resultIcon} ${resultText}</h3>
                <p><strong>Correct Answer:</strong> ${message.correct_answer}</p>
                <p><strong>Your Range:</strong> ${myResult.guess_min} - ${myResult.guess_max}</p>
                <p><strong>Score:</strong> ${pointsText}</p>
            </div>
        `;
    }
    
    // Display aggregate statistics if available
    if (message.statistics && Object.keys(message.statistics).length > 0) {
        const stats = message.statistics;
        
        // Remove existing stats if any
        const existingStats = document.getElementById('game-stats-container');
        if (existingStats) existingStats.remove();

        const statsDiv = document.createElement('div');
        statsDiv.id = 'game-stats-container';
        statsDiv.innerHTML = `
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 10px 0; color: #1e293b;">📊 Overall Predictions</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <div><strong>Total Range:</strong> ${stats.overall_min?.toFixed(1)} - ${stats.overall_max?.toFixed(1)}</div>
                    <div><strong>Average Guess:</strong> ${stats.average_midpoint?.toFixed(1)}</div>
                    <div><strong>Median Guess:</strong> ${stats.median_midpoint?.toFixed(1)}</div>
                    ${stats.iqr !== undefined ? `
                        <div><strong>IQR:</strong> ${stats.q1?.toFixed(1)} - ${stats.q3?.toFixed(1)}</div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Append to the main container, so it appears at the bottom
        const gameArea = document.querySelector('.closest-guess-area');
        if (gameArea) {
            gameArea.appendChild(statsDiv);
        }
    }
}
