# 🚀 Quick Start Guide - Dev Mode

## TL;DR - Get Started in 30 Seconds

```bash
# 1. Open VS Code with Live Server
# 2. Navigate to one of these URLs:

# Player view (mobile)
http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_active

# Projector view (large screen)
http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=speed_tap_projector_active
```

**That's it!** The game loads instantly with mock data, no backend needed.

---

## 📱 Testing Workflow

### Side-by-Side Testing
Open two browser windows to compare layouts:

**Window 1:** Player view
```
http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_active
```

**Window 2:** Projector view
```
http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=speed_tap_active
```

**Edit CSS → Refresh both → See changes instantly**

---

## 🎯 Available States

### Speed Tap
| Quick Link | What You'll See |
|------------|-----------------|
| [🎮 Active Game](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_active) | Active question with timer running |
| [✅ Correct Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_results_correct) | End of round - player got it right ✓ |
| [❌ Incorrect Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_results_incorrect) | End of round - player got it wrong ✗ |
| [📺 Projector Active](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=speed_tap_projector_active) | Projector view with participation counter |
| [📺 Projector Results](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=speed_tap_projector_results) | Projector results with leaderboard |

### Word Guess
| Quick Link | What You'll See |
|------------|-----------------|
| [🎮 Active Game](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=word_guess_active) | Hangman-style word game with letter selection |
| [✅ Correct Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=word_guess_results_correct) | Success - word revealed |
| [❌ Incorrect Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=word_guess_results_incorrect) | Failure - ran out of lives |
| [📺 Projector Active](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=word_guess_projector_active) | Projector view showing word progress |
| [📺 Projector Results](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=word_guess_projector_results) | Projector results with fastest player |

### Closest Guess
| Quick Link | What You'll See |
|------------|-----------------|
| [🎮 Active Game](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=closest_guess_active) | Range estimation with live number line |
| [✅ Correct Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=closest_guess_results_correct) | Win - range captured answer |
| [❌ Incorrect Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=closest_guess_results_incorrect) | Loss - range missed answer |
| [📺 Projector Active](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=closest_guess_projector_active) | Projector view with submitted ranges |
| [📺 Projector Results](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=closest_guess_projector_results) | Projector results showing top scorer |

### Push Range
| Quick Link | What You'll See |
|------------|-----------------|
| [🎮 Active Game](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=push_range_active) | Team-based button mashing |
| [✅ Correct Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=push_range_results_correct) | Success - range captured answer |
| [❌ Incorrect Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=push_range_results_incorrect) | Failure - range missed answer |
| [📺 Projector Active](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=push_range_projector_active) | Projector view with team assignments |
| [📺 Projector Results](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=push_range_projector_results) | Projector results with top pressers |

### Crowd Wisdom
| Quick Link | What You'll See |
|------------|-----------------|
| [🎮 Active Game](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=crowd_wisdom_active) | Live distribution bars showing crowd votes |
| [✅ Correct Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=crowd_wisdom_results_correct) | Success - correct answer with speed bonus |
| [❌ Incorrect Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=crowd_wisdom_results_incorrect) | Wrong answer on tough question |
| [📺 Projector Active](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=crowd_wisdom_projector_active) | Projector view with live distribution animation |
| [📺 Projector Results](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=crowd_wisdom_projector_results) | Projector results showing answer distribution |

### Line Fit
| Quick Link | What You'll See |
|------------|-----------------|
| [🎮 Active Game](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=line_fit_active) | Scatter plot with interactive line drawing |
| [✅ Correct Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=line_fit_results_correct) | High accuracy fit (94% R²) |
| [❌ Incorrect Result](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=line_fit_results_incorrect) | Poor fit (48% R²) with feedback |
| [📺 Projector Active](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=line_fit_projector_active) | Projector view with scatter plot and live submissions |
| [📺 Projector Results](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=line_fit_projector_results) | Projector results showing best fit player |

### Waiting Screens (Between Rounds)
| Quick Link | What You'll See |
|------------|-----------------|
| [⏳ Speed Tap](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=waiting_speed_tap) | Waiting screen with Speed Tap instruction card |
| [⏳ Line Fit](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=waiting_line_fit) | Waiting screen with Line Fit instruction card |
| [⏳ Crowd Wisdom](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=waiting_crowd_wisdom) | Waiting screen with Crowd Wisdom instruction card |
| [⏳ Word Guess](http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=waiting_word_guess) | Waiting screen with Word Guess instruction card |
| [⏳ Projector](http://localhost:5500/admin_pages/games/game-projector.html?dev=1&state=waiting_projector) | Projector waiting screen (between rounds) |

---

## 🎨 Common Tasks

### Tweaking Answer Button Layout
```
1. Open: game-play.html?dev=1&state=speed_tap_active
2. Edit: CSS for .answer-btn
3. Refresh browser
4. Repeat
```

### Testing Mobile Responsiveness
```
1. Open: game-play.html?dev=1&state=speed_tap_active
2. Press F12 (DevTools)
3. Ctrl+Shift+M (Toggle device toolbar)
4. Select iPhone/Android device
5. Refresh with different states
```

### Testing Projector Leaderboard
```
1. Open: game-projector.html?dev=1&state=speed_tap_results_correct
2. See 10 players on leaderboard
3. Edit leaderboard CSS
4. Refresh to see changes
```

---

## 🐛 Troubleshooting

### Not working?

1. **Check URL has both parameters:**
   - ✓ `?dev=1`
   - ✓ `&state=speed_tap_active`

2. **Check console (F12) for:**
   ```
   🚧🚧🚧 DEV MODE ACTIVE 🚧🚧🚧
   ```

3. **Verify hostname is `localhost`:**
   - ✓ Works: `http://localhost:5500/...`
   - ✗ Fails: `http://127.0.0.1:5500/...` (check api-config.js allows this)

### Wrong state showing?

- Verify filename matches exactly (without `.json`)
- Check file exists: `admin_pages/games/dev_data/snapshots/speed_tap_active.json`
- Validate JSON syntax (use JSONLint if needed)

---

## 📂 Files Changed

Quick reference for what was modified:

```
mktg_bivariate_tools/
├── shared/js/api-config.js                     ← Added DEV_MODE flag
├── admin_pages/games/
│   ├── game-play.html                          ← Added auth bypass
│   ├── game-projector.html                     ← Added auth bypass
│   ├── js/game-core.js                         ← Added MockWebSocket
│   └── dev_data/                               ← NEW FOLDER
│       ├── README.md                           ← Full documentation
│       ├── QUICK_START.md                      ← This file
│       └── snapshots/
│           ├── speed_tap_active.json
│           ├── speed_tap_results_correct.json
│           ├── speed_tap_results_incorrect.json
│           └── speed_tap_projector_active.json
```

---

## 🔐 Safety Check

**Before deploying to production:**

1. Test normal game still works without `?dev=1`
2. Try adding `?dev=1` to production URL - should NOT activate
3. Console should NOT show dev warnings on drbakermarketing.com

**Dev mode is SAFE because:**
- Hostname check: Only works on `localhost`
- No backend changes: Can't affect production server
- Read-only: Mock data never writes to database

---

## 🎓 Next Steps

**Want to add more game types?**

1. Copy `speed_tap_active.json` as template
2. Update `game_type` field
3. Modify game-specific data
4. Test with `?dev=1&state=your_new_state`

**Need help?** Check the full README:
```
admin_pages/games/dev_data/README.md
```

---

**Last Updated:** December 16, 2025  
**System Version:** 1.0
