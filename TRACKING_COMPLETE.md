# Usage Tracking Integration - Complete

## What Was Added

### 1. Authentication & Tracking Module
**File**: `shared/js/auth_tracking.js`

Core functionality:
- User authentication (login, register, logout)
- Automatic usage tracking
- Analytics data retrieval
- UI helpers for auth status

### 2. Login & Registration Pages
- `login.html` - User login interface
- `register.html` - New user registration with course codes

### 3. Integration Example
**File**: `apps/pearson_correlation/main_pearson.html` + `pearson_app.js`

Shows complete integration:
- Script included in HTML
- Usage tracked after calculation
- Auth status displayed in header

### 4. Documentation
**File**: `INTEGRATION_GUIDE.md`

Complete guide with:
- Quick start instructions
- Code examples for each tool type
- Best practices
- Troubleshooting

---

## How It Works

### For Students

1. **Register** with course code → Creates account, links to course
2. **Login** → Stored token enables tracking
3. **Use tools** → Every run automatically tracked
4. **View stats** → See personal usage history

### For You

All usage data flows to your backend:
- Which tools students use
- How often they use them
- What parameters they choose
- When they're most active

---

## Quick Integration Steps

### Add to Any Tool (5 minutes)

1. **Add script to HTML** (before closing `</body>`):
```html
<script src="../../shared/js/auth_tracking.js"></script>
```

2. **Track usage in JavaScript** (after main calculation):
```javascript
await logToolUsage('tool-slug-here', {
    param1: value1,
    param2: value2
}, 'Brief result summary');
```

Done! Auth status appears in header, usage tracked for logged-in users.

---

## Already Integrated

✅ **Pearson Correlation** - Full integration complete
- Script loaded
- Usage tracked after correlation computed
- Auth UI showing in header

---

## Next Tools to Integrate

Recommended order (most used first):

1. **Bivariate Regression** - `apps/bivariate_regression/`
2. **Multiple Regression** - `apps/ml_regression/`
3. **Logistic Regression** - `apps/log_regression/`
4. **Welch's t-test** - `apps/ind_ttest/`
5. **Paired t-test** - `apps/paired_ttest/`
6. **One-Way ANOVA** - `apps/onewayanova/`
7. **A/B Proportion** - `apps/ab_proportion/`
8. **Chi-Square** - `apps/chisquare/`
9. **McNemar** - `apps/mcnemar/`
10. **K-Means** - `apps/kmeans/`

... and all others

---

## Testing Checklist

For each tool:
- [ ] Add `auth_tracking.js` script to HTML
- [ ] Add `logToolUsage()` call in main function
- [ ] Open tool in browser
- [ ] Click "Login" (should see login form)
- [ ] Login with test account
- [ ] Header shows "✓ Logged in as username"
- [ ] Run the tool
- [ ] Console shows "Usage tracked: ..."
- [ ] Check backend `/api/analytics/my-usage/` to verify

---

## Backend Connection

**Backend URL**: `https://drbaker-backend.onrender.com/api`

**Endpoints Used**:
- `POST /auth/login/` - User login
- `POST /auth/register/` - New registration
- `POST /auth/logout/` - User logout
- `POST /log-tool-run/` - Track usage
- `GET /analytics/my-usage/` - View history
- `GET /analytics/my-stats/` - View stats
- `GET /analytics/course/` - Course analytics

---

## Local Development

When testing locally:
1. Tools work without auth (tracking skipped)
2. Login/register connect to production backend
3. Once logged in, tracking works locally too

**No backend setup needed** for frontend development!

---

## Production Deployment

When you push to production (Netlify/Squarespace):
- Login/register pages work automatically
- All authenticated users tracked
- Data stored in backend database
- Analytics available via API

---

## Student Instructions

### First Time Setup
1. Get registration code from instructor
2. Go to `register.html`
3. Enter code + create account
4. Auto-logged in, ready to use tools

### Daily Use
1. Go to any tool
2. If not logged in, click "Login" in header
3. Use tools normally
4. All usage tracked automatically

---

## Analytics Dashboard (Future)

Planned features:
- Student view: Personal stats and progress
- Instructor view: Class engagement and leaderboards
- Tool popularity rankings
- Usage trends over time
- Export to CSV for grading

---

## Files Modified

```
mktg_bivariate_tools/
├── shared/
│   └── js/
│       └── auth_tracking.js          [NEW]
├── apps/
│   └── pearson_correlation/
│       ├── main_pearson.html         [MODIFIED]
│       └── pearson_app.js            [MODIFIED]
├── login.html                         [NEW]
├── register.html                      [NEW]
├── INTEGRATION_GUIDE.md              [NEW]
└── TRACKING_COMPLETE.md              [THIS FILE]
```

---

## Questions?

- **Integration help**: See `INTEGRATION_GUIDE.md`
- **API docs**: See backend `USAGE_TRACKING_GUIDE.md`
- **Backend issues**: Check Render logs
- **Frontend issues**: Check browser console

---

## Next Steps

1. Test Pearson correlation tool with login
2. Pick next tool to integrate
3. Copy integration pattern from `pearson_app.js`
4. Repeat for all tools
5. Build analytics dashboard
6. Roll out to students!

**Estimated time to integrate all tools**: 2-3 hours

Happy tracking! 📊
