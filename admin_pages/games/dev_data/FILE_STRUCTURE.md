# 📁 Dev Mode File Structure

```
mktg_bivariate_tools/
└── admin_pages/
    └── games/
        ├── dev_data/                                    ← NEW: Dev mode assets
        │   ├── README.md                                ← Full documentation (START HERE)
        │   ├── QUICK_START.md                           ← 30-second usage guide
        │   ├── SNAPSHOT_CATALOG.md                      ← Visual index of all states
        │   ├── FILE_STRUCTURE.md                        ← This file
        │   └── snapshots/                               ← Mock game state JSON files
        │       ├── speed_tap_active.json                ← Active question (player view)
        │       ├── speed_tap_results_correct.json       ← Correct answer results
        │       ├── speed_tap_results_incorrect.json     ← Incorrect answer results
        │       └── speed_tap_projector_active.json      ← Active question (projector view)
        │
        ├── game-play.html                               ← MODIFIED: Added dev mode bypass
        ├── game-projector.html                          ← MODIFIED: Added dev mode bypass
        │
        └── js/
            ├── game-core.js                             ← MODIFIED: Added MockWebSocket class
            ├── game-config.js                           ← Unchanged
            ├── game-utils.js                            ← Unchanged
            ├── game-speed-tap.js                        ← Unchanged (works with mock data)
            ├── game-closest-guess.js                    ← Unchanged
            ├── game-push-range.js                       ← Unchanged
            ├── game-crowd-wisdom.js                     ← Unchanged
            ├── game-word-guess.js                       ← Unchanged
            └── line-fit.js                              ← Unchanged

shared/
└── js/
    └── api-config.js                                    ← MODIFIED: Added DEV_MODE flag
```

---

## 🎯 Where to Look

### 📖 **Want to understand the system?**
→ Start with `dev_data/README.md`

### 🚀 **Want to use it right now?**
→ Open `dev_data/QUICK_START.md`

### 📸 **Want to see available states?**
→ Check `dev_data/SNAPSHOT_CATALOG.md`

### ➕ **Want to add new game types?**
→ Copy a file from `dev_data/snapshots/`, modify, and use

### 🐛 **Something not working?**
→ Check `dev_data/README.md` → "Debugging" section

### 🔧 **Want to modify dev mode behavior?**
→ Edit `shared/js/api-config.js` (DEV_MODE flag)  
→ Edit `admin_pages/games/js/game-core.js` (MockWebSocket class)

---

## 📝 Quick File Reference

### Documentation Files (dev_data/)

| File | Purpose | Read Time |
|------|---------|-----------|
| `README.md` | Complete system documentation | 10 min |
| `QUICK_START.md` | Get started immediately | 2 min |
| `SNAPSHOT_CATALOG.md` | Visual index of states | 5 min |
| `FILE_STRUCTURE.md` | This file | 1 min |

### Snapshot Files (dev_data/snapshots/)

| File | View | State Type |
|------|------|------------|
| `speed_tap_active.json` | Player | Active round |
| `speed_tap_projector_active.json` | Projector | Active round |
| `speed_tap_results_correct.json` | Both | End of round (success) |
| `speed_tap_results_incorrect.json` | Both | End of round (failure) |

### Modified Code Files

| File | Changes Made | Safe to Deploy |
|------|--------------|----------------|
| `shared/js/api-config.js` | Added DEV_MODE flag + hostname check | ✅ Yes |
| `admin_pages/games/js/game-core.js` | Added MockWebSocket class | ✅ Yes |
| `admin_pages/games/game-play.html` | Added auth bypass script block | ✅ Yes |
| `admin_pages/games/game-projector.html` | Added auth bypass script block | ✅ Yes |

---

## 🎨 Typical Workflow

```
1. Open documentation
   └── dev_data/README.md or QUICK_START.md

2. Choose a snapshot state
   └── Check dev_data/SNAPSHOT_CATALOG.md

3. Open browser with dev mode URL
   └── http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_active

4. Edit CSS/HTML in code editor
   └── game-play.html, game-projector.html, or game-speed-tap.js

5. Refresh browser
   └── See changes instantly

6. Switch states to test different UI scenarios
   └── Change ?state=speed_tap_active to ?state=speed_tap_results_correct
```

---

## 🔍 Finding Things

### "Where are the mock game states stored?"
→ `dev_data/snapshots/*.json`

### "Where is the dev mode flag set?"
→ `shared/js/api-config.js` (top of file)

### "Where is the mock WebSocket?"
→ `admin_pages/games/js/game-core.js` (top, before `connectWebSocket()`)

### "Where is auth bypassed?"
→ `game-play.html` and `game-projector.html` (after api-config.js load)

### "How do I add a new game type?"
→ Create new JSON file in `dev_data/snapshots/`, use `?state=your_filename`

---

## 📊 Size Impact

**Total new files:** 8  
**Total modified files:** 4  
**Disk space added:** ~20KB  
**Production impact:** Zero (dev mode disabled on production hostname)

---

**Last Updated:** December 16, 2025  
**System Version:** 1.0
