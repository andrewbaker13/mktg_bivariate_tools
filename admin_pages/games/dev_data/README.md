# 🚧 Dev Mode - UI-First Development System

This folder contains mock data and documentation for **UI-First Development Mode** - a system that allows rapid iteration on game layouts without running the full backend.

## 🎯 Purpose

**Problem:** Tweaking CSS, testing mobile layouts, or refining projector displays requires:
- Running Django backend
- Creating game sessions
- Joining as multiple players
- Waiting for rounds to start

**Solution:** Dev mode loads static mock data and bypasses authentication, letting you:
- ✅ Instantly see any game state (active, results, leaderboard)
- ✅ Test player and projector views side-by-side
- ✅ Iterate on CSS/HTML without backend dependency
- ✅ Work offline or when backend is sleeping

---

## 🔒 Safety

**Dev mode ONLY activates when:**
1. URL contains `?dev=1` **AND**
2. Hostname is `localhost` or `127.0.0.1`

**On production (drbakermarketing.com):** Dev mode is impossible to activate due to hostname check.

---

## 📁 Folder Structure

```
dev_data/
├── README.md                           ← You are here
└── snapshots/                          ← Mock game state JSON files
    ├── speed_tap_active.json           ← Speed Tap during active round
    ├── speed_tap_results_correct.json  ← Speed Tap results (player got it right)
    ├── speed_tap_results_incorrect.json← Speed Tap results (player got it wrong)
    ├── speed_tap_projector_active.json ← Speed Tap projector view (with participation)
    └── (future game snapshots here)
```

---

## 🚀 Usage

### Basic Usage - Single State

**Player View (Mobile):**
```
http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_active
```

**Projector View (Large Screen):**
```
http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=speed_tap_projector_active
```

### Available States (Speed Tap)

| State | File | Description |
|-------|------|-------------|
| `speed_tap_active` | speed_tap_active.json | Active round, question showing |
| `speed_tap_results_correct` | speed_tap_results_correct.json | End of round, player answered correctly |
| `speed_tap_results_incorrect` | speed_tap_results_incorrect.json | End of round, player answered incorrectly |
| `speed_tap_projector_active` | speed_tap_projector_active.json | Projector view during active round |

### Side-by-Side Testing

**Test both views simultaneously:**
1. Open Window 1: `game-play.html?dev=1&state=speed_tap_active`
2. Open Window 2: `game-projector.html?dev=1&state=speed_tap_active`
3. Edit CSS in your code editor
4. Refresh both windows
5. See changes instantly across both layouts

---

## 🔧 How It Works

### 1. DEV_MODE Flag (`shared/js/api-config.js`)
```javascript
const DEV_MODE = window.location.search.includes('dev=1') && 
                 (window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1');
```

### 2. Mock WebSocket (`admin_pages/games/js/game-core.js`)
- Replaces real WebSocket with `MockWebSocket` class
- Loads snapshot JSON file based on `?state=` parameter
- Simulates message flow without server connection

### 3. Auth Bypass (`game-play.html` / `game-projector.html`)
```javascript
if (window.DEV_MODE) {
    // Auto-populate sessionStorage with mock auth data
    sessionStorage.setItem('authToken', 'DEV_MOCK_TOKEN');
    sessionStorage.setItem('gameSession', JSON.stringify({...}));
}
```

### 4. Snapshot Files
Each JSON file contains:
- Message type (`game_started`, `game_results`, etc.)
- Game data (question, options, leaderboard, etc.)
- Player/game metadata

---

## 📝 Adding New Snapshots

### For New Game Types

1. **Create snapshot file:** `dev_data/snapshots/closest_guess_active.json`
2. **Copy structure from backend message:** Check Django console or browser DevTools
3. **Use realistic mock data:** Fake names, plausible scores
4. **Test it:** `?dev=1&state=closest_guess_active`

### Example Snapshot Structure

```json
{
  "type": "game_started",
  "game_type": "speed_tap",
  "question_text": "What is 2 + 2?",
  "options": [
    {"id": "A", "text": "3"},
    {"id": "B", "text": "4"},
    {"id": "C", "text": "5"},
    {"id": "D", "text": "22"}
  ],
  "current_round": 1,
  "total_rounds": 5,
  "game_time_limit": 20,
  "start_time": "2025-12-16T10:00:00Z"
}
```

---

## 🐛 Debugging

### Dev mode not activating?

**Check console for:**
```
🚧🚧🚧 DEV MODE ACTIVE 🚧🚧🚧
Hostname: localhost
```

**If not showing:**
- Verify URL has `?dev=1`
- Verify hostname is `localhost` (not `127.0.0.1` if checking for `localhost`)
- Check browser console for errors

### State not loading?

**Check:**
1. `?state=` parameter matches filename (without `.json`)
2. File exists in `dev_data/snapshots/`
3. JSON is valid (use JSONLint)
4. Browser console shows: `Loading snapshot: speed_tap_active.json`

---

## 🎨 Common UI Workflows

### Tweaking Answer Button Spacing
```
1. Open: game-play.html?dev=1&state=speed_tap_active
2. Edit: CSS for .answer-btn in game-play.html
3. Refresh browser
4. Repeat until perfect
```

### Testing Projector Leaderboard
```
1. Edit snapshot: Add more players to test long lists
2. Open: game-projector.html?dev=1&state=speed_tap_results_correct
3. See leaderboard rendering with many players
```

### Testing Mobile Layout
```
1. Open: game-play.html?dev=1&state=speed_tap_active
2. Open DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M)
4. Select iPhone or Android device
5. Refresh with different states
```

---

## 🚨 Important Notes

### Do NOT Use Real Data
- ❌ Don't copy real student names
- ❌ Don't use actual email addresses
- ✅ Use fake names: "Alice", "Bob", "Player 1"
- ✅ Use obviously fake data

### Production Deployment
- ✅ Safe to deploy these files to production
- ✅ Dev mode cannot activate on production hostname
- ✅ JSON files are only loaded if DEV_MODE = true
- ✅ No backend changes required

### Git Considerations
```gitignore
# Optional: If snapshots ever contain sensitive test data
admin_pages/games/dev_data/snapshots/*.json
```

---

## 🔄 State Lifecycle Example (Speed Tap)

```
1. ?state=speed_tap_active
   ↓ Question showing, timer running
   
2. ?state=speed_tap_results_correct
   ↓ Player sees checkmark, points earned
   
3. ?state=speed_tap_active  (next round)
   ↓ New question loads
```

---

## 📞 Support

**Questions about dev mode?**
- Check console warnings/errors
- Verify URL structure: `?dev=1&state=filename_without_json`
- Confirm you're on `localhost`

**Want to add a new game type?**
1. Copy an existing snapshot as template
2. Update game_type and game-specific fields
3. Test with `?dev=1&state=your_new_state`

---

**Last Updated:** December 16, 2025  
**System Version:** 1.0  
**Supported Games:** Speed Tap (more coming soon)
