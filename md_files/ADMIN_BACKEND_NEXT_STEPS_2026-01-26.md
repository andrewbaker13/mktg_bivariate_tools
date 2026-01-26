# Admin Dashboard - Backend Work Required

**Created:** 2026-01-26  
**Purpose:** Handoff document for continuing backend endpoint implementation  
**Status:** Frontend complete, backend partially complete

---

## 📍 Current State Summary

The admin dashboard has been restructured into a multi-page system:
- **admin-dashboard.html** - Main hub with analytics + navigation cards
- **admin-users.html** - User management (✅ FULLY WORKING)
- **admin-courses.html** - Course management (✅ 90% WORKING)
- **admin-codes.html** - Registration code management (⚠️ 50% WORKING)
- **admin-quizzes.html** - Quiz management (❌ NEEDS BACKEND)
- **admin-games.html** - Game session management (❌ NEEDS BACKEND)
- **admin-system.html** - System monitoring (❌ NEEDS BACKEND)

All frontend pages are complete with zero linting errors. Three compatibility bugs were fixed (documented in `ADMIN_COMPATIBILITY_FIXES_2026-01-25.md`).

---

## 🎯 Backend Endpoints To Implement

### Priority 1: Registration Codes (admin-codes.html)

The frontend exists but needs these backend endpoints in `core/admin_views.py`:

#### 1.1 GET /api/admin/codes/ - System-Wide Code Listing
```python
# Purpose: Get ALL registration codes across ALL courses for admin view
# Permission: Superuser only
# Returns: All codes with course info, status, usage stats

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_codes(request):
    if not request.user.is_superuser:
        return Response({'error': 'Admin access required'}, status=403)
    
    codes = RegistrationCode.objects.select_related('course').all()
    # Return id, code, course_id, course_name, is_active, used_count, created_at
```

#### 1.2 POST /api/courses/<id>/bulk-deactivate-codes/
```python
# Purpose: Deactivate all unused codes for a specific course at once
# Permission: Superuser or course owner
# Existing endpoint to modify: Check if exists, may need to create
```

#### 1.3 POST /api/courses/<id>/generate-codes/
```python
# Purpose: Bulk create registration codes for a course
# Parameters: count (number of codes to generate)
# Permission: Superuser or course owner
# Note: May already exist - check course_views.py
```

### Priority 2: Quiz Management (admin-quizzes.html)

These endpoints need to be created in `core/quiz_views.py` or a new `core/admin_quiz_views.py`:

#### 2.1 GET /api/admin/quizzes/ - List All Quizzes
```python
# Purpose: Get ALL quizzes across all courses with ownership info
# Permission: Superuser only
# Returns: quiz_id, title, course_id, course_name, owner, question_count, 
#          attempt_count, is_visible, created_at
```

#### 2.2 GET /api/quiz/<id>/analytics/
```python
# Purpose: Get analytics for a specific quiz
# Returns: attempt_count, average_score, completion_rate, 
#          question_performance (per-question stats)
```

#### 2.3 PATCH /api/quiz/<id>/visibility/
```python
# Purpose: Toggle quiz visibility (show/hide from students)
# Permission: Superuser or quiz owner
```

#### 2.4 GET /api/admin/quizzes/export/
```python
# Purpose: Export quiz data as CSV
# Permission: Superuser only
```

### Priority 3: Game Management (admin-games.html)

These endpoints go in `core/game_views.py` or new `core/admin_game_views.py`:

#### 3.1 GET /api/admin/games/sessions/
```python
# Purpose: Get all game sessions across all courses
# Returns: session_id, game_type, course_id, host_username, 
#          player_count, status, created_at, ended_at
```

#### 3.2 PATCH /api/admin/games/sessions/<id>/end/
```python
# Purpose: Force-end an active game session
# Permission: Superuser only
```

#### 3.3 GET /api/admin/games/templates/
```python
# Purpose: Get all game templates/configurations
# Returns: template_id, name, game_type, owner, question_count, uses_count
```

#### 3.4 DELETE /api/admin/games/templates/<id>/
```python
# Purpose: Delete a game template
# Permission: Superuser or template owner
```

#### 3.5 GET /api/admin/games/questions/
```python
# Purpose: Get all game questions system-wide
# Returns: question_id, text, game_type, template_id, owner, difficulty
```

### Priority 4: System Monitoring (admin-system.html)

These endpoints go in `core/admin_views.py`:

#### 4.1 GET /api/admin/system/health/
```python
# Purpose: System health check
# Returns: database_status, cache_status, last_backup, uptime, 
#          error_rate_24h, avg_response_time
```

#### 4.2 GET /api/admin/system/performance/
```python
# Purpose: Performance metrics
# Returns: active_users_now, requests_today, avg_response_ms, 
#          slowest_endpoints, peak_hours
```

#### 4.3 GET /api/admin/system/logs/
```python
# Purpose: Recent system logs with filtering
# Parameters: level (info/warning/error), hours (timeframe), search (text)
# Note: May require logging configuration in Django
```

#### 4.4 GET /api/admin/system/database-stats/
```python
# Purpose: Database statistics
# Returns: table_sizes, total_users, total_courses, total_quizzes, 
#          total_game_sessions, storage_used
```

---

## 📁 Files To Modify

### Backend (drbaker_backend/):

1. **core/admin_views.py** - Add new admin endpoints
   - Currently has: list_all_users, promote_to_staff, promote_to_superuser, demote_from_staff, get_user_courses, list_all_courses_admin
   - Add: list_all_codes, system health endpoints

2. **core/urls.py** - Add URL patterns for new endpoints
   - Current admin patterns:
   ```python
   path('admin/users/', list_all_users, name='admin-users'),
   path('admin/users/<int:user_id>/promote-staff/', promote_to_staff, name='promote-staff'),
   path('admin/users/<int:user_id>/promote-superuser/', promote_to_superuser, name='promote-superuser'),
   path('admin/users/<int:user_id>/demote-staff/', demote_from_staff, name='demote-staff'),
   path('admin/users/<int:user_id>/courses/', get_user_courses, name='admin-user-courses'),
   path('admin/courses/', list_all_courses_admin, name='admin-courses'),
   ```

3. **core/quiz_views.py** - Add quiz admin endpoints (or create admin_quiz_views.py)

4. **core/game_views.py** - Add game admin endpoints (or create admin_game_views.py)

### Frontend (mktg_bivariate_tools/):

No frontend changes needed - all pages are complete. Just update endpoint URLs if they differ from what's coded.

---

## 🔧 Implementation Pattern

All admin endpoints follow this pattern (from existing admin_views.py):

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])  # or POST, PATCH, DELETE
@permission_classes([IsAuthenticated])
def endpoint_name(request):
    # Check superuser permission
    if not request.user.is_superuser:
        return Response({'error': 'Admin access required'}, status=403)
    
    # Your logic here
    
    return Response(data)
```

---

## ✅ What's Already Working

These endpoints exist and are properly connected to the frontend:

| Endpoint | Purpose | Status |
|----------|---------|--------|
| GET /api/admin/users/ | List all users | ✅ Works |
| PATCH /api/admin/users/<id>/promote-staff/ | Make user instructor | ✅ Works |
| PATCH /api/admin/users/<id>/promote-superuser/ | Make user admin | ✅ Works |
| PATCH /api/admin/users/<id>/demote-staff/ | Remove instructor | ✅ Works |
| GET /api/admin/users/<id>/courses/ | User's owned courses | ✅ Works |
| GET /api/admin/courses/ | List all courses | ✅ Works |
| POST /api/courses/create/ | Create course | ✅ Works |
| PUT /api/courses/<id>/ | Update course | ✅ Works |
| PATCH /api/courses/<id>/transfer-ownership/ | Transfer course | ✅ Works |
| GET /api/courses/<id>/codes/ | Codes for one course | ✅ Works |
| POST /api/registration-codes/<id>/deactivate/ | Deactivate code | ✅ Works |
| GET /api/analytics/system/overview/ | System overview | ✅ Works |
| GET /api/analytics/system/growth/ | Growth stats | ✅ Works |
| GET /api/analytics/system/tools/ | Tool usage stats | ✅ Works |
| GET /api/analytics/system/courses/ | Course stats | ✅ Works |

---

## 🚀 Recommended Order of Work

1. **Start with list_all_codes()** - This unlocks admin-codes.html functionality
2. **Add quiz list endpoint** - Most commonly used admin feature
3. **Add game sessions endpoint** - If games are actively used
4. **System monitoring last** - Nice-to-have, not critical

---

## 📝 Related Documentation

- `ADMIN_IMPLEMENTATION_REVIEW_2026-01-25.md` - Full implementation details
- `ADMIN_COMPATIBILITY_FIXES_2026-01-25.md` - Bugs found and fixed

---

## 🔑 Key Context for New LLM

1. **Authentication:** Token-based (auth_tracking.js handles this globally)
2. **API Base URL:** Defined in shared/auth_tracking.js as API_BASE (localhost vs production)
3. **Permission Model:** 
   - `is_staff` = instructor (can manage own courses)
   - `is_superuser` = admin (can manage everything)
4. **Superuser Bypass:** Added to `can_manage_course()` in auth_views.py
5. **Frontend Location:** mktg_bivariate_tools/admin_pages/
6. **Backend Location:** drbaker_backend/core/
