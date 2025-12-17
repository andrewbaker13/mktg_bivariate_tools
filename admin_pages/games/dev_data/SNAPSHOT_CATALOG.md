# 📸 Snapshot Catalog

Visual index of all available dev mode states.

---

## 🎮 Speed Tap

### Active Round
**File:** `speed_tap_active.json`  
**Player URL:** `?dev=1&state=speed_tap_active`  
**Projector URL:** N/A (use `speed_tap_projector_active`)

**What you'll see:**
- Question: "Which marketing metric measures the percentage of customers who make a repeat purchase?"
- 4 answer options (CAC, CLV, Retention Rate, Churn Rate)
- Timer: 20 seconds
- Points decay indicator
- Round 3 of 5

**Best for testing:**
- Answer button layout
- Timer positioning
- Mobile responsiveness
- Question text wrapping

---

### Active Round (Projector)
**File:** `speed_tap_projector_active.json`  
**Player URL:** N/A  
**Projector URL:** `?dev=1&state=speed_tap_projector_active`

**What you'll see:**
- Same question as above
- 15 players listed
- Participation counter: "X / 15 Players Responded"
- Percentage: "0%"
- Large text for projection

**Best for testing:**
- Projector layout scaling
- Participation counter UI
- Large screen readability
- Answer option display (non-interactive)

---

### Results - Correct Answer ✓
**File:** `speed_tap_results_correct.json`  
**Player URL:** `?dev=1&state=speed_tap_results_correct`  
**Projector URL:** `?dev=1&state=speed_tap_results_correct`

**What you'll see:**
- Correct answer: "Retention Rate" (highlighted green with ✔️)
- Player answered: "Retention Rate"
- Points earned: 85 points
- Multiplier: 1.5x
- Success message
- Leaderboard with 10 players

**Best for testing:**
- Correct answer styling
- Success feedback UI
- Leaderboard display
- Point/multiplier badges

---

### Results - Incorrect Answer ✗
**File:** `speed_tap_results_incorrect.json`  
**Player URL:** `?dev=1&state=speed_tap_results_incorrect`  
**Projector URL:** `?dev=1&state=speed_tap_results_incorrect`

**What you'll see:**
- Correct answer: "Retention Rate" (highlighted green)
- Player answered: "Churn Rate" (highlighted red with ❌)
- Points earned: 0
- Error message
- Player dropped to rank 5
- Leaderboard with 10 players

**Best for testing:**
- Incorrect answer styling
- Error feedback UI
- Rank change display
- Player position highlighting

---

## 🎨 UI Testing Matrix

| Test Case | State to Use | Window Setup |
|-----------|-------------|--------------|
| Mobile answer buttons | `speed_tap_active` | Player view + DevTools responsive mode |
| Projector participation | `speed_tap_projector_active` | Projector view fullscreen |
| Success feedback | `speed_tap_results_correct` | Player view |
| Error handling | `speed_tap_results_incorrect` | Player view |
| Leaderboard layout | `speed_tap_results_correct` | Both player + projector |
| Side-by-side comparison | `speed_tap_active` | Player + Projector windows |

---

## 📊 Mock Data Details

### Players
All snapshots use these fake player names:
- Alice Johnson
- Bob Martinez
- Charlie Davis
- Diana Chen
- Ethan Wilson
- Fiona Taylor
- George Lee
- Hannah Patel
- Isaac Brown
- Julia Kim
- Kevin Rodriguez (projector only)
- Laura Smith (projector only)
- Michael Wong (projector only)
- Nina Garcia (projector only)
- Oscar Thompson (projector only)

### Scores
- Range: 270 - 520 points
- Ranks: 1-10 (or 1-5 for incorrect answer)
- Round scores included for multi-round context

---

## 🔄 State Flow Example

Typical game progression:

```
1. speed_tap_active
   ↓ (Question showing)
   
2. speed_tap_results_correct OR speed_tap_results_incorrect
   ↓ (Results showing)
   
3. speed_tap_active
   ↓ (Next question)
```

To test this flow:
1. Load `?state=speed_tap_active`
2. Edit URL to `?state=speed_tap_results_correct`
3. Refresh
4. Edit URL back to `?state=speed_tap_active`
5. Refresh

---

## ➕ Adding Your Own Snapshots

### Template Structure

```json
{
  "type": "game_started",
  "game_type": "speed_tap",
  "question_text": "Your question here",
  "options": [
    {"id": "A", "text": "Option A"},
    {"id": "B", "text": "Option B"},
    {"id": "C", "text": "Option C"},
    {"id": "D", "text": "Option D"}
  ],
  "current_round": 1,
  "total_rounds": 5,
  "game_time_limit": 20,
  "start_time": "2025-12-16T10:00:00Z",
  "image_url": null
}
```

### Tips
- Use realistic questions from your domain (Marketing)
- Keep player names obviously fake
- Use timestamp in future so timer doesn't instantly expire
- Test JSON validity before using

---

**Last Updated:** December 16, 2025  
**Total Snapshots:** 4 (Speed Tap only)
