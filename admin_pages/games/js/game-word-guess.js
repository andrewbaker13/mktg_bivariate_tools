/**
 * Word Guess Game Module
 * Handles the Word Guess game mode logic
 */

let wordGuessState = {
    answer: '',
    revealedIndices: new Set(),
    hasAnswered: false,
    currentInput: ''
};

function showWordGuessGame(message, timeLimit) {
    console.log('=== showWordGuessGame DEBUG ===');
    console.log('message:', message);
    
    // Reset state for new round
    wordGuessState = {
        answer: message.game_config?.answer || '',
        revealedIndices: new Set(),
        hasAnswered: false,
        currentInput: ''
    };
    
    const hint = message.game_config?.hint || '';
    const answer = wordGuessState.answer.toUpperCase();
    const words = answer.split(' ');
    
    // Build letter grid HTML
    let letterGridHTML = '<div class="word-guess-grid">';
    let charIndex = 0;
    
    words.forEach((word, wordIdx) => {
        letterGridHTML += '<div class="word-row">';
        for (let i = 0; i < word.length; i++) {
            letterGridHTML += `
                <div class="letter-box" data-index="${charIndex}" data-char="${word[i]}">
                    <span class="player-letter" id="playerLetter${charIndex}"></span>
                    <span class="revealed-letter" id="revealedLetter${charIndex}"></span>
                </div>
            `;
            charIndex++;
        }
        letterGridHTML += '</div>';
        
        // Add space between words (but not after last word)
        if (wordIdx < words.length - 1) {
            letterGridHTML += '<div class="word-space"></div>';
        }
    });
    
    letterGridHTML += '</div>';
    
    const imageHTML = message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: 100%; max-height: 25vh; margin: 0.5rem auto; border-radius: 8px; display: block; object-fit: contain;">` : '';
    
    // Player view styling variables
    const questionSize = window.isProjectorMode ? '56px' : '1.1rem';
    const hintColor = window.isProjectorMode ? 'white' : '#64748b';
    const hintSize = window.isProjectorMode ? '40px' : '1rem';
    
    // Projector mode: show timer and points in white boxes like Speed Tap
    if (window.isProjectorMode) {
        document.getElementById('gameArea').innerHTML = `
            <div class="word-guess-area">
                <div class="question-display" style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: nowrap; margin: 20px 0;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 120px;">${timeLimit}</div>
                    <div class="question-text" style="font-size: 48px; font-weight: 700; text-align: center; background: white; border-radius: 16px; padding: 30px 50px; color: #1e293b; flex: 1; max-width: 70%;">${message.question_text}</div>
                    <div style="font-size: 48px; font-weight: 800; color: #10b981; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 160px;" id="availablePoints">100 pts</div>
                </div>
                ${imageHTML}
                ${hint ? `<div class="hint-text" style="color: white; font-style: italic; margin: 20px 0; font-size: 40px; font-weight: 600; text-align: center;">Hint: ${hint}</div>` : ''}
                
                ${letterGridHTML}
                
                <div id="feedback" style="margin-top: 30px; font-size: 32px; color: white; font-weight: 600; min-height: 50px; text-align: center;"></div>
            </div>
            
            <style>
                .word-guess-area {
                    padding: 2rem;
                }
                .word-guess-grid {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    margin: 2rem 0;
                    width: 100%;
                }
                .word-row {
                    display: flex;
                    gap: 12px;
                    flex-wrap: nowrap;
                    justify-content: center;
                    max-width: 100%;
                }
                .word-space {
                    height: 2rem;
                    width: 100%;
                }
                .letter-box {
                    width: 80px;
                    height: 100px;
                    border: 4px solid #3b82f6;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    background: white;
                    font-size: 56px;
                    font-weight: 800;
                    flex-shrink: 1;
                    min-width: 60px;
                }
                .player-letter {
                    color: #6b7280;
                    position: absolute;
                    font-weight: 700;
                }
                .revealed-letter {
                    color: #3b82f6;
                    position: absolute;
                    font-weight: 800;
                }
            </style>
        `;
        return;
    }
    
    document.getElementById('gameArea').innerHTML = `
        <div class="word-guess-area">
            <div class="question-display">
                <div class="question-text" style="font-size: ${questionSize};">${message.question_text}</div>
                ${imageHTML}
                ${hint ? `<div class="hint-text" style="color: ${hintColor}; font-style: italic; margin-top: 10px; font-size: ${hintSize}; font-weight: 600;">Hint: ${hint}</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <div class="timer" id="timer">${timeLimit}</div>
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;" id="availablePoints">100 pts</div>
                </div>
            </div>
            
            ${letterGridHTML}
            
            <div class="word-guess-input-area">
                <input 
                    type="text" 
                    id="wordGuessInput" 
                    class="word-guess-input" 
                    placeholder="Type your guess"
                    maxlength="100"
                    autocomplete="off"
                    spellcheck="false"
                >
                <button class="submit-word-btn" onclick="submitWordGuess()" disabled style="opacity: 0.5; cursor: not-allowed;">Submit Answer</button>
            </div>
            
            <div id="feedback" style="margin-top: 20px; font-size: 18px; color: #64748b; font-weight: 500; min-height: 30px;"></div>
        </div>
        
        <style>
            .word-guess-area {
                padding: 1rem;
            }
            .word-guess-grid {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                margin: 1rem 0;
                width: 100%;
            }
            .word-row {
                display: flex;
                gap: 4px;
                flex-wrap: nowrap;
                justify-content: center;
                max-width: 100%;
            }
            .word-space {
                height: 1rem; /* Vertical space between words */
                width: 100%;
            }
            .letter-box {
                width: 40px;
                height: 50px;
                border: 2px solid #3b82f6;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                background: white;
                font-size: 24px;
                font-weight: 700;
                flex-shrink: 1; /* Allow shrinking */
                min-width: 20px;
            }
            
            @media (max-width: 480px) {
                .letter-box {
                    width: 30px;
                    height: 40px;
                    font-size: 18px;
                    border-width: 2px;
                }
                .word-row {
                    gap: 2px;
                }
            }
            
            @media (max-width: 360px) {
                .letter-box {
                    width: 24px;
                    height: 34px;
                    font-size: 14px;
                }
            }

            .player-letter {
                color: #6b7280;
                position: absolute;
            }
            .revealed-letter {
                color: #000;
                position: absolute;
                animation: revealPop 0.3s ease;
            }
            @keyframes revealPop {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }
            .letter-box.correct {
                background: #d1fae5;
                border-color: #10b981;
            }
            .word-guess-input-area {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                justify-content: center;
            }
            .word-guess-input {
                flex: 1;
                max-width: 500px;
                padding: 15px;
                font-size: 18px;
                border: 3px solid #3b82f6;
                border-radius: 8px;
                text-transform: uppercase;
                font-weight: 600;
            }
            .word-guess-input:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            .word-guess-input:disabled {
                background: #f1f5f9;
                cursor: not-allowed;
            }
            .submit-word-btn {
                padding: 15px 30px;
                font-size: 18px;
                font-weight: 700;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .submit-word-btn:hover:not(:disabled) {
                background: #2563eb;
                transform: translateY(-2px);
            }
            .submit-word-btn:disabled {
                background: #94a3b8;
                cursor: not-allowed;
            }
        </style>
    `;
    
    // Add input handler for real-time display
    const input = document.getElementById('wordGuessInput');
    if (input) {
        input.addEventListener('input', handleWordGuessInput);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitWordGuess();
            }
        });
        input.focus();
    }
}

function handleWordGuessInput(e) {
    const input = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '');
    e.target.value = input;
    wordGuessState.currentInput = input;
    
    // Update player letters in grid
    const answer = wordGuessState.answer.toUpperCase();
    const answerNoSpaces = answer.replace(/ /g, '');
    const inputNoSpaces = input.replace(/ /g, '');
    
    // Clear all player letters first
    document.querySelectorAll('.player-letter').forEach(el => {
        el.textContent = '';
    });
    
    // Display player's input
    for (let i = 0; i < Math.min(inputNoSpaces.length, answerNoSpaces.length); i++) {
        const letterEl = document.getElementById(`playerLetter${i}`);
        if (letterEl && !wordGuessState.revealedIndices.has(i)) {
            letterEl.textContent = inputNoSpaces[i];
        }
    }
    
    // Enable/disable submit button based on whether EXACTLY the right number of letters are filled
    const submitBtn = document.querySelector('.submit-word-btn');
    if (submitBtn) {
        if (inputNoSpaces.length === answerNoSpaces.length) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
    }
}

function submitWordGuess() {
    if (wordGuessState.hasAnswered) return;
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    
    const input = document.getElementById('wordGuessInput');
    // Normalize: Remove all spaces (spaces don't matter for answer checking)
    const answer = input.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/ /g, '').trim();
    
    // Validate length - ensure at least 2 characters
    if (answer.length < 2) {
        const feedback = document.getElementById('feedback');
        if (feedback) {
            feedback.innerHTML = '<div style="color: #ef4444;">Please enter an answer</div>';
            setTimeout(() => { feedback.innerHTML = ''; }, 2000);
        }
        return;
    }
    
    // UI Feedback - show submitting state
    const submitBtn = document.querySelector('.submit-word-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        submitBtn.style.opacity = '0.7';
    }
    input.disabled = true;
    
    websocket.send(JSON.stringify({
        action: 'word_guess_submit',
        data: {
            player_session_id: playerSession.id,
            answer: answer,
            timestamp: Date.now() / 1000
        }
    }));
}

function handleWordGuessReveal(message) {
    console.log('[WORD GUESS] Received reveal message:', message);
    
    // Update revealed letters
    const revealedLetters = message.revealed_letters || [];
    console.log('[WORD GUESS] Revealing', revealedLetters.length, 'letters:', revealedLetters);
    
    revealedLetters.forEach(item => {
        const index = item.index;
        const letter = item.letter;
        wordGuessState.revealedIndices.add(index);
        
        const revealedEl = document.getElementById(`revealedLetter${index}`);
        console.log(`[WORD GUESS] Letter ${index}: element found=${!!revealedEl}, letter='${letter}'`);
        if (revealedEl) {
            revealedEl.textContent = letter;
        }
        
        // Hide player letter if revealed
        const playerEl = document.getElementById(`playerLetter${index}`);
        if (playerEl) {
            playerEl.textContent = '';
        }
    });
    
    console.log('[WORD GUESS] Total revealed indices:', wordGuessState.revealedIndices.size);
}

function handleWordGuessResult(message) {
    wordGuessState.hasAnswered = true;
    
    // Disable input
    const input = document.getElementById('wordGuessInput');
    const submitBtn = document.querySelector('.submit-word-btn');
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    
    // Show correct answer
    const answer = message.correct_answer?.toUpperCase() || wordGuessState.answer.toUpperCase();
    const answerNoSpaces = answer.replace(/ /g, '');
    
    for (let i = 0; i < answerNoSpaces.length; i++) {
        const revealedEl = document.getElementById(`revealedLetter${i}`);
        if (revealedEl) {
            revealedEl.textContent = answerNoSpaces[i];
        }
        
        const letterBox = document.querySelector(`.letter-box[data-index="${i}"]`);
        if (letterBox && message.is_correct) {
            letterBox.classList.add('correct');
        }
    }
    
    // Show feedback
    const feedback = document.getElementById('feedback');
    if (feedback) {
        if (message.is_correct) {
            feedback.innerHTML = `<div style="color: #10b981; font-size: 24px; font-weight: 700;">✅ Correct! +${message.points} points</div>`;
        } else {
            feedback.innerHTML = `<div style="color: #ef4444; font-size: 18px;">❌ Incorrect. The answer was: ${answer}</div>`;
        }
    }
}

function startWordGuessTimer(seconds, startTime) {
    // Clear any existing timer first
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerEl = document.getElementById('timer');
    const availablePointsEl = document.getElementById('availablePoints');
    const endTime = startTime + (seconds * 1000);
    
    // Calculate reveal schedule
    // Reveal up to 40% of letters over the duration
    const answer = wordGuessState.answer ? wordGuessState.answer.replace(/ /g, '') : '';
    const totalLetters = answer.length;
    const lettersToReveal = Math.max(1, Math.floor(totalLetters * 0.4));
    const revealInterval = seconds / (lettersToReveal + 1);
    let nextRevealTime = seconds - revealInterval;
    
    function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        const remainingPercent = (remaining / seconds) * 100;
        
        if (timerEl) {
            timerEl.textContent = remaining;
            
            if (remaining <= 5) {
                timerEl.style.color = '#ef4444';
                timerEl.style.animation = 'pulse 0.5s infinite';
            }
        }
        
        // Update available points based on time remaining
        // Linear decay from 100 to 10 points
        const points = Math.max(10, Math.round(10 + 90 * (remainingPercent / 100)));
        
        if (availablePointsEl) {
            availablePointsEl.textContent = `${points} pts`;
        }
        
        // Timer update only - letter reveals come from server via word_guess_reveal messages
        // No client-side randomization to ensure all players see the same letters
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            
            // Disable input
            const input = document.getElementById('wordGuessInput');
            const submitBtn = document.querySelector('.submit-word-btn');
            if (input) input.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            
            // Send timeout to server
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'word_guess_timeout',
                    data: {
                        player_session_id: playerSession.id
                    }
                }));
            }
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every 100ms for smooth countdown
    timerInterval = setInterval(updateTimer, 100);
}
function handleWordGuessResults(message) {
    // End-of-round summary for Word Guess
    console.log('Word Guess round results:', message);
    
    // Show correct answer
    const answer = message.correct_answer.toUpperCase();
    const answerNoSpaces = answer.replace(/ /g, '');
    
    for (let i = 0; i < answerNoSpaces.length; i++) {
        const revealedEl = document.getElementById(`revealedLetter${i}`);
        if (revealedEl) {
            revealedEl.textContent = answerNoSpaces[i];
        }
        
        const letterBox = document.querySelector(`.letter-box[data-index="${i}"]`);
        if (letterBox) {
            letterBox.classList.add('correct');
        }
    }
    
    // Show final results feedback
    const feedback = document.getElementById('feedback');
    if (feedback) {
        const myResult = message.player_results?.find(p => p.player_id === playerSession.id);
        if (myResult) {
            const correctPercentage = message.correct_count ? 
                Math.round((message.correct_count / (message.correct_count + message.no_answer_count)) * 100) : 0;
            
            let resultHTML = '';
            if (myResult.is_correct) {
                resultHTML = `
                    <div style="color: #10b981; font-size: 24px; font-weight: 700; margin-bottom: 10px;">
                        ✅ Correct! +${myResult.points} points
                    </div>
                `;
            } else if (myResult.answered) {
                resultHTML = `
                    <div style="color: #ef4444; font-size: 20px; font-weight: 600; margin-bottom: 10px;">
                        ❌ Your answer: ${myResult.answer}
                    </div>
                `;
            } else {
                resultHTML = `
                    <div style="color: #94a3b8; font-size: 18px; margin-bottom: 10px;">
                        ⏰ No answer submitted
                    </div>
                `;
            }
            
            resultHTML += `
                <div style="font-size: 18px; color: #1e293b; margin-top: 15px;">
                    <div><strong>Correct Answer:</strong> ${answer}</div>
                    <div style="margin-top: 8px;"><strong>${correctPercentage}%</strong> of players got it right (${message.correct_count}/${message.correct_count + message.no_answer_count})</div>
                </div>
            `;
            
            feedback.innerHTML = resultHTML;
        }
    }
}