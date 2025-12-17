# 🎮 Dev Mode - Start Here

**UI-First Development System for Praxis Play Games**

This folder contains everything you need to rapidly iterate on game UI without running the full backend.

---

## 🚀 Quick Start (30 seconds)

1. Open Live Server in VS Code
2. Visit: `http://localhost:5500/admin_pages/games/game-play.html?dev=1&state=speed_tap_active`
3. Edit CSS, refresh, repeat

**That's it!** No Django, no database, no WebSocket server needed.

---

## 📚 Documentation

| File | What's Inside | When to Use |
|------|---------------|-------------|
| **[QUICK_START.md](QUICK_START.md)** | Get started in 30 seconds | First time using dev mode |
| **[README.md](README.md)** | Complete documentation | Understanding the system |
| **[SNAPSHOT_CATALOG.md](SNAPSHOT_CATALOG.md)** | Visual index of all states | Choosing which state to test |
| **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)** | File organization guide | Finding specific files |
| **[INDEX.md](INDEX.md)** | This file | Starting point |

---

## 📸 Available Snapshots

### Speed Tap (4 states)
- ✅ `speed_tap_active` - Active question (player view)
- ✅ `speed_tap_projector_active` - Active question (projector view)
- ✅ `speed_tap_results_correct` - Correct answer results
- ✅ `speed_tap_results_incorrect` - Incorrect answer results

**More game types coming soon!**

---

## 🎯 Common Use Cases

### "I want to tweak the answer button spacing"
```
1. Open: game-play.html?dev=1&state=speed_tap_active
2. Edit: CSS in game-play.html or game-speed-tap.js
3. Refresh browser
```

### "I want to test projector view with many players"
```
1. Open: game-projector.html?dev=1&state=speed_tap_projector_active
2. Edit: snapshots/speed_tap_projector_active.json (add more players)
3. Refresh browser
```

### "I want to compare player and projector layouts"
```
1. Window 1: game-play.html?dev=1&state=speed_tap_active
2. Window 2: game-projector.html?dev=1&state=speed_tap_active
3. Edit CSS, refresh both windows
```

### "I want to test mobile responsiveness"
```
1. Open: game-play.html?dev=1&state=speed_tap_active
2. F12 → Ctrl+Shift+M (device toolbar)
3. Select iPhone/Android
```

---

## 🔐 Is This Safe for Production?

**YES!** Dev mode only activates when:
1. URL contains `?dev=1` **AND**
2. Hostname is `localhost`

**On production:** Dev mode is impossible to activate due to hostname check.

See [README.md](README.md) for complete safety analysis.

---

## 🛠️ What Was Modified

- **api-config.js** - Added DEV_MODE flag
- **game-core.js** - Added MockWebSocket class
- **game-play.html** - Added auth bypass
- **game-projector.html** - Added auth bypass

All changes are **safe** and **production-ready**.

---

## ➕ Extending Dev Mode

### Add a new game type:
1. Copy `snapshots/speed_tap_active.json`
2. Rename to `closest_guess_active.json`
3. Update `game_type` and game-specific fields
4. Test: `?dev=1&state=closest_guess_active`

### Add a new Speed Tap state:
1. Copy existing Speed Tap snapshot
2. Modify data (question, scores, etc.)
3. Save as `speed_tap_custom.json`
4. Test: `?dev=1&state=speed_tap_custom`

---

## 📊 System Stats

- **Total documentation files:** 5
- **Total snapshot files:** 4
- **Code files modified:** 4
- **Backend changes:** 0
- **Production risk:** None

---

## 🆘 Need Help?

### Dev mode not activating?
→ Check [README.md](README.md) → "Debugging" section

### Want to see all available states?
→ Open [SNAPSHOT_CATALOG.md](SNAPSHOT_CATALOG.md)

### Need to understand the file structure?
→ Review [FILE_STRUCTURE.md](FILE_STRUCTURE.md)

### Want step-by-step instructions?
→ Follow [QUICK_START.md](QUICK_START.md)

---

## 🎓 Learning Path

**New to dev mode?**
1. Start → [QUICK_START.md](QUICK_START.md) (2 min)
2. Explore → Try a few URLs with different states (5 min)
3. Learn → Read [README.md](README.md) (10 min)
4. Master → Review [SNAPSHOT_CATALOG.md](SNAPSHOT_CATALOG.md) (5 min)

**Total time:** ~20 minutes to full understanding

---

## 🌟 Benefits

✅ **No backend needed** - Work offline or when server is sleeping  
✅ **Instant refresh** - See CSS changes immediately  
✅ **Multi-view testing** - Compare player + projector simultaneously  
✅ **Edge case testing** - Create extreme scenarios easily  
✅ **Safe for production** - Hostname-locked to localhost  
✅ **Easy to extend** - Add new game types by copying JSON  

---

**System Version:** 1.0  
**Last Updated:** December 16, 2025  
**Supported Games:** Speed Tap (more coming soon)

**Ready to start?** → Open [QUICK_START.md](QUICK_START.md)
