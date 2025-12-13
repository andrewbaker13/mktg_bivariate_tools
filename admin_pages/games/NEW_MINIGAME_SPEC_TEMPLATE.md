# New Minigame Specification Template

**Last Updated**: December 2025  
**Architecture Version**: Modular Multi-Round System

Use this template to define the requirements for a new minigame. This provides the complete "blueprint" for implementing backend logic, WebSocket handling, frontend UI, and multi-round integration.

---

## 1. Game Identity

- **Game Name**: (e.g., "Market Share Tug-of-War")
- **Internal ID**: `snake_case` format (e.g., `market_tug_war`)
- **One-Line Pitch**: (e.g., "Teams tap rapidly to pull the market share indicator to their side")
- **Learning Objective**: What marketing/stats concept does this reinforce?
- **Game Category**:
  - [ ] Speed & Accuracy (Speed Tap, Word Guess)
  - [ ] Range/Estimation (Closest Guess, Push Range)
  - [ ] Knowledge/Prediction (Crowd Wisdom)
  - [ ] Team Coordination (Push Range)

---

## 2. Gameplay Mechanics

### Core Loop
- **Player Action**: What does the user physically do?
  - Examples: Tap button, drag slider, type text, select from options, adjust range
- **Win Condition**: How do you win?
  - Examples: Highest score, fastest time, closest guess, team victory, most accurate
- **Round Duration**: How long per round? (5-60 seconds typical)

### Scoring Logic
- **Base Points**: Starting points value (typically 100)
- **Time Decay**: How do points decrease over time?
  - [ ] Linear decay (e.g., 100 → 10 over time)
  - [ ] Step/tier decay (e.g., 100 first 5s, 50 next 10s, 10 after)
  - [ ] No decay
- **Accuracy Bonus**: Does precision matter?
  - [ ] Distance-based (closer = more points)
  - [ ] Range-based (narrower range = multiplier)
  - [ ] Binary (correct/incorrect only)
- **Special Mechanics**:
  - Penalty for wrong answers?
  - Bonus for being first?
  - "Tough question bonus" (correct when majority is wrong)?
  - Team contribution multiplier?

### Multiplayer Interaction Type
- [ ] **Independent**: Players compete individually, scores compared at end
- [ ] **Real-time Competitive**: Players see live progress/rankings
- [ ] **Cooperative**: All players work toward shared goal
- [ ] **Team-based**: Players split into groups (e.g., Red vs Blue)
- [ ] **Asymmetric**: Different player roles (e.g., host vs players)

---

## 3. Backend Architecture

### Game Logic Class Structure
Location: `core/games/[your_game].py`

Your game class must inherit from `BaseGame` and implement:

```python
class YourGameClass(BaseGame):
    """
    [Game Name] Game Logic
    [Brief description of mechanics]
    """
    
    async def handle_action(self, action, data, player_session_id):
        """
        Route actions to appropriate handlers
        Actions: '[game]_action', '[game]_timeout', etc.
        """
        if action == 'your_game_action':
            await self.handle_player_action(data, player_session_id)
        elif action == 'your_game_timeout':
            await self.handle_timeout(data)
    
    async def handle_player_action(self, data, player_session_id):
        """Process player input during active gameplay"""
        # Validate input
        # Update game state
        # Calculate results
        # Broadcast updates to all players
        pass
    
    async def handle_timeout(self, data):
        """Handle round end due to timer expiration"""
        await self.end_round(reason='timeout')
    
    async def end_round(self, reason):
        """
        End the current round, calculate results, broadcast
        """
        # Check if already ended
        if await self.is_game_ended_or_paused():
            return
        
        # Get game info
        game_info = await self.consumer.get_game_info()
        
        # Calculate results
        results_data = await self.calculate_results()
        
        # Update scores
        for result in results_data.get('player_results', []):
            await self.consumer.update_player_score(
                result['player_id'], 
                result['points']
            )
        
        # Save history
        await self.consumer.save_round_history(
            'your_game', 
            results_data, 
            game_info
        )
        
        # Broadcast unified results
        await self.consumer.broadcast_unified_results(
            'your_game', 
            results_data, 
            game_info
        )
        
        # Update leaderboard
        await self.consumer.broadcast_leaderboard()
        
        # Mark completed/paused
        was_completed = await self.consumer.mark_game_completed()
        if not was_completed:
            await self.consumer.pause_game_session()
        
        # Broadcast game ended
        await self.consumer.broadcast_game_ended_with_stats({
            'type': 'game_ended',
            'reason': reason,
            'message': 'Round complete!',
            'correct_answer': results_data.get('correct_answer'),
            'game_specific': {
                # Game-specific stats here
            }
        })
    
    @database_sync_to_async
    def calculate_results(self):
        """
        Calculate final results for the round
        MUST return dict with:
        - 'correct_answer': the answer value
        - 'player_results': list of dicts with player_id, points, etc.
        - game-specific stats
        """
        pass
    
    @database_sync_to_async
    def is_game_ended_or_paused(self):
        """Check if game already ended to prevent duplicate processing"""
        from ..models import GameSession
        try:
            game = GameSession.objects.get(room_code=self.game_session.room_code)
            return game.status in ['completed', 'paused']
        except GameSession.DoesNotExist:
            return True
```

### Registry Registration
Add your game to `core/games/registry.py`:

```python
from .your_game import YourGameClass

GAME_REGISTRY = {
    # ... existing games ...
    'your_game': YourGameClass,
}
```

### Consumer Integration
**IMPORTANT**: Game logic is automatically initialized! When the instructor starts a round:
1. Backend sends `countdown_start` message with `game_data.game_type`
2. Each player's consumer receives this and calls `initialize_game_logic(game_type)`
3. `self.game_logic` is set to your game class instance

You DO NOT need to modify `consumers.py` for basic games! The framework handles:
- Game logic initialization (per round, per player)
- Score updates (`update_player_score()`)
- Game state updates (`update_player_game_state()`)
- Round completion (`mark_game_completed()`, `pause_game_session()`)

### WebSocket Message Flow

**Player → Backend (Action Messages)**:
```json
{
  "action": "your_game_action",
  "data": {
    "player_session_id": 123,
    "your_data": "value",
    "timestamp": 1234567890
  }
}
```

**Backend → All Players (Broadcast Messages)**:

1. **Game Start** (automatically handled):
```json
{
  "type": "countdown_start",
  "duration": 3,
  "current_round": 1,
  "total_rounds": 5,
  "game_data": {
    "question_text": "...",
    "game_type": "your_game",
    "game_time_limit": 20,
    "game_config": { /* your custom data */ },
    "image_url": "...",
    "options": []
  }
}
```

2. **Live Updates** (your game's responsibility):
```json
{
  "type": "your_game_update",
  "data": { /* live game state */ }
}
```

3. **Round Results** (automatically handled by framework):
```json
{
  "type": "game_ended",
  "reason": "timeout",
  "correct_answer": 42,
  "game_specific": {
    /* your game's stats from calculate_results() */
  },
  "round_stats": {
    "percent_scored": 75.0,
    "player_stats": {
      "123": {
        "player_round_score": 85,
        "player_total_score": 420
      }
    }
  },
  "current_round": 1,
  "total_rounds": 5
}
```

---

## 4. Frontend Implementation

### File Structure
Your game needs ONE file: `admin_pages/games/js/game-[your-game].js`

### Required Functions

```javascript
/**
 * [Your Game] Game Module
 * Handles the [Game Name] game mode logic
 */

function showYourGame(message, timeLimit) {
    // 1. Extract data from message
    const questionText = message.question_text;
    const imageUrl = message.image_url;
    const gameConfig = message.game_config || {};
    
    // 2. Build HTML for game area
    document.getElementById('gameArea').innerHTML = `
        <div class="your-game-area">
            <div class="question-display">
                <div class="question-text">${questionText}</div>
                ${imageUrl ? `<img src="${imageUrl}" ...>` : ''}
                <div class="timer" id="timer">${timeLimit}</div>
            </div>
            
            <!-- Your game UI here -->
            
            <div id="feedback"></div>
        </div>
    `;
    
    // 3. Set up event listeners
    document.getElementById('yourButton')?.addEventListener('click', handleYourAction);
}

function handleYourAction() {
    // Send action to backend
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    
    websocket.send(JSON.stringify({
        action: 'your_game_action',
        data: {
            player_session_id: playerSession.id,
            your_data: 'value',
            timestamp: Date.now() / 1000
        }
    }));
    
    // Update UI to show submission
    // Disable buttons, show "Waiting..." message
}

function handleYourGameUpdate(message) {
    // Handle live updates from backend
    // Update visualizations, progress bars, etc.
}

function startYourGameTimer(timeLimit, startTime) {
    // Standard timer countdown logic
    // Update points display with decay
    // Send timeout message when time expires
}
```

### Message Router Integration
Add your message handlers to `game-core.js`:

```javascript
case 'your_game_update':
    if (typeof handleYourGameUpdate === 'function') {
        handleYourGameUpdate(message);
    }
    break;
```

### Game Startup Integration
Add your game to `handleGameStart()` in `game-core.js`:

```javascript
} else if (gameType === 'your_game' && typeof showYourGame === 'function') {
    showYourGame(message, timeLimit);
    startYourGameTimer(timeLimit, startTime);
}
```

### Instruction Card
Add your game to `getInstructionCardHTML()` in `game-core.js`:

```javascript
const gameTypeHelpers = {
    // ... existing games ...
    'your_game': {
        title: '🎮 Your Game Name',
        description: 'Brief description of how to play!<br>Include scoring rules and strategy tips.'
    }
};
```

---

## 5. Question/Template Configuration

### GameQuestion Fields
When creating questions for your game, use these key fields:

- **question_text**: The prompt/question displayed to players
- **game_type**: Set to your `internal_id` (e.g., 'your_game')
- **time_limit_seconds**: Default round duration (5-60 typical)
- **game_config** (JSON): Custom game data
  ```json
  {
    "answer": "CORRECT VALUE",
    "correct_value": 42,
    "options": [{"id": "A", "text": "Option A"}, ...],
    "hint": "Optional hint text",
    "numberline_min": 0,
    "numberline_max": 100,
    "max_range_width": 20,
    // Any other game-specific config
  }
  ```
- **image_url**: Optional image to display with question
- **options** (JSON): For multiple choice, stored as array

### Multi-Round Templates
GameTemplates group questions into sequences:
- **template_name**: "Marketing Mix Quiz Round 1"
- **questions**: Array of GameQuestion IDs
- **shuffle_questions**: Randomize order?
- **enforce_sequence**: Must play in order?

---

## 6. Data Flow & State Management

### Player Game State
Each player has a `game_state` JSON field for temporary round data:

```python
# Update player's game state
await self.consumer.update_player_game_state(player_session_id, {
    'your_game_answer': 'value',
    'your_game_timestamp': time.time(),
    'your_game_score': 85
})

# Read player's game state
player = await self.consumer.get_player_session(player_session_id)
answer = player.game_state.get('your_game_answer')
```

**Important**: Game state is CLEARED between rounds automatically.

### Persistent Scoring
Two score tracking systems:

1. **PlayerSession.score**: Cumulative score across all rounds (atomic F() updates)
2. **PlayerScore.total_points**: Multi-round game cumulative (with round_scores history)

The framework handles both automatically when you call:
```python
await self.consumer.update_player_score(player_id, points)
```

### Round History
Every round is saved with detailed analytics:
```python
await self.consumer.save_round_history(
    'your_game',  # game_type
    results_data,  # from calculate_results()
    game_info  # current round/total rounds
)
```

This creates entries in each player's `game_state['round_history']` with:
- Round number, game type, timestamp
- Player's answer, points earned, correctness
- Game-specific stats (speed, accuracy, etc.)
- Used for analytics and export

---

## 7. Edge Cases & Best Practices

### Late Joiners
Framework handles this automatically:
- Players marked as `joined_mid_game=True`
- Excluded from leaderboard rankings (but can play)
- Can join when game is 'paused' (between rounds)

### Disconnects & Reconnects
- Players keep their `game_state` on reconnect
- WebSocket reconnection is automatic
- Score persists in database

### Minimum Players
No hard minimum - games work with 1+ players. Consider:
- Team games need at least 2 players (framework doesn't enforce)
- Competitive games more fun with 3+ players

### Performance Considerations
- **Avoid database queries in loops** - batch operations
- **Use F() expressions** for atomic score updates
- **Cache frequently accessed data** in game class
- **Limit broadcast frequency** for real-time updates (max 2/second)

### Error Handling
Always wrap actions in try/catch:
```python
try:
    # Your game logic
except Exception as e:
    logger.error(f"Error in your_game: {e}", exc_info=True)
    # Don't crash the entire game
```

### Testing Checklist
- [ ] Single player completes round successfully
- [ ] Multiple players compete simultaneously
- [ ] Scoring calculates correctly
- [ ] Timer expiration handled gracefully
- [ ] Results display all stats properly
- [ ] Multi-round progression works
- [ ] Late joiners can enter between rounds
- [ ] Player disconnect/reconnect maintains state
- [ ] Instruction card displays between rounds
- [ ] Leaderboard updates correctly
- [ ] Export includes all round data

---

## 8. UI/UX Requirements

### Player View (Mobile/Desktop)
- **Input Controls**: Large, touch-friendly buttons (min 44x44px)
- **Visual Feedback**: 
  - Button state changes (disabled, active, submitted)
  - Loading spinners during processing
  - Success/error messages
- **Live Stats**: 
  - Current score display
  - Timer countdown
  - Team/personal progress indicators

### Responsive Design
- Must work on phones (320px width)
- Touch-optimized (no hover-required interactions)
- Large text (min 16px, 18px+ for primary)

### Accessibility
- Color contrast ratios meet WCAG AA (4.5:1 for text)
- Don't rely solely on color (use icons + text)
- Keyboard navigation support
- Screen reader friendly (semantic HTML)

### Performance
- Target <100ms interaction response
- Smooth animations (60fps)
- Minimal network requests during gameplay

---

## 9. Assets & Styling

### Visual Theme
- **Primary Color Scheme**: Match game mechanics (e.g., blue/red for teams)
- **Typography**: Use site default (system fonts)
- **Icons**: Emoji preferred (universal, no loading), or Font Awesome

### CSS Classes
Use existing game classes when possible:
- `.question-display` - Question container
- `.timer` - Countdown timer
- `.answer-btn` - Standard button
- `.waiting-state` - Between-round display

### Custom Styling
Add game-specific styles in your JS file:
```javascript
document.getElementById('gameArea').innerHTML = `
    <style>
        .your-game-specific-class {
            /* Your styles */
        }
    </style>
    <div class="your-game-area">...</div>
`;
```

---

## 10. Complete Implementation Checklist

### Backend
- [ ] Create game logic class in `core/games/your_game.py`
- [ ] Implement `handle_action()`, `end_round()`, `calculate_results()`
- [ ] Add to `GAME_REGISTRY` in `core/games/registry.py`
- [ ] Test WebSocket message handling
- [ ] Verify score calculation logic
- [ ] Test multi-round progression

### Frontend
- [ ] Create `game-your-game.js` module
- [ ] Implement `showYourGame()` and action handlers
- [ ] Add message handlers to `game-core.js` router
- [ ] Add to `handleGameStart()` switch
- [ ] Create instruction card entry
- [ ] Test UI on mobile and desktop
- [ ] Verify timer and scoring display

### Questions/Content
- [ ] Create sample GameQuestions with proper `game_config`
- [ ] Test with various difficulty levels
- [ ] Verify image display if using images
- [ ] Create multi-round template for testing

### Testing & Polish
- [ ] Single player end-to-end test
- [ ] Multi-player concurrent test
- [ ] Network disconnect/reconnect test
- [ ] Late joiner test
- [ ] Cross-browser compatibility
- [ ] Mobile device testing
- [ ] Performance under load (10+ players)

---

**Ready to implement?** Fill out sections 1-2 with your game concept, then work through the backend (section 3), frontend (section 4), and testing (section 10) systematically. The framework handles most of the heavy lifting - you focus on the unique game mechanics!
