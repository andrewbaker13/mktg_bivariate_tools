# What Happens When an Instructor is Demoted or Deleted?

## Scenario: Admin Demotes an Instructor (is_staff = True → False)

### 🎓 **Student Experience: COMPLETELY UNAFFECTED**

Students will experience **NO DISRUPTION** because:

1. **Course Access is Independent of Instructor Status**
   - Students access courses via `CourseEnrollment` model
   - `CourseEnrollment` links: `user_profile` → `course`
   - Instructor's staff status doesn't affect this relationship
   - Students can still:
     - ✅ Use all tools
     - ✅ Take quizzes
     - ✅ Play games
     - ✅ View their own analytics
     - ✅ See their course information

2. **Tool Access is User-Based, Not Instructor-Dependent**
   - Tool runs are logged per user
   - No permission checks tied to instructor status
   - Platform functionality continues normally

---

## 🔒 **What the Demoted Instructor LOSES**

When `is_staff` changes from `True` to `False`:

### ❌ Cannot Access Instructor Dashboard
- Blocked by: `instructor.html` access check (when re-enabled)
- Cannot create new courses
- Cannot generate registration codes

### ❌ Cannot Manage Their Own Courses
Blocked by this function in `auth_views.py`:
```python
def can_manage_course(user, course):
    return user.is_staff and course.course_owner == user
    #      ^^^^^^^^^^^^^^ - This becomes False
```

**They lose ability to**:
- View registration codes
- Deactivate/reactivate codes
- Edit course settings
- Download code CSV
- View course analytics (via instructor endpoints)

### ✅ What They KEEP
- Regular student access to all tools
- Their user account
- Login credentials
- Any student-level features

---

## 👨‍💼 **What Happens to Their Courses?**

### Course Ownership Remains
```python
Course.course_owner = demoted_user  # Still points to them
Course.original_creator = demoted_user  # Never changes
```

The courses **do NOT disappear** - they become "unmanaged":
- Course record exists in database
- Students still enrolled
- Registration codes still valid (if not expired)
- **BUT**: No one can manage them (unless admin intervenes)

---

## 🔧 **Admin Access: CURRENTLY LIMITED**

### What Admins CAN Do:
✅ **View All Courses**
```python
# In list_courses endpoint
if request.user.is_staff:
    courses = Course.objects.all()  # Sees everything
```

✅ **Transfer Course Ownership** (Superuser Only)
```python
# Endpoint: /api/courses/<id>/transfer-ownership/
# Can reassign courses to a different instructor
```

### What Admins CANNOT Do (Currently):
❌ **Manage Courses They Don't Own**

Why? Because `can_manage_course()` checks:
```python
def can_manage_course(user, course):
    return user.is_staff and course.course_owner == user
    #                       ^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                       Must be the owner
```

This means even superusers cannot:
- Edit course settings they don't own
- View/manage registration codes for other courses
- Generate additional codes for other courses
- **Unless they transfer ownership to themselves first**

---

## 🚨 **RECOMMENDED FIX: Superuser Bypass**

### Current Problem:
If Instructor A is demoted, Admin cannot fix their courses without:
1. Transferring ownership to Admin first
2. Making changes
3. Transferring back to a new instructor

### Proposed Solution:
Modify `can_manage_course()` in `auth_views.py`:

```python
def can_manage_course(user, course):
    """
    Check if a user has permission to manage a course.
    Returns True if:
    - User is a superuser (can manage ANY course), OR
    - User is staff AND owns the course
    """
    if user.is_superuser:
        return True  # 🔑 SUPERUSER BYPASS
    return user.is_staff and course.course_owner == user
```

**Benefits**:
- Admins can immediately manage orphaned courses
- No ownership transfers needed for admin maintenance
- Faster resolution when instructor leaves

---

## 📋 **Best Practices for Demoting Instructors**

### Option 1: Transfer First (Recommended)
```
1. Identify all courses owned by instructor
2. Transfer each course to another instructor
3. Verify transfer successful
4. Demote instructor to student
```

### Option 2: With Superuser Bypass (Faster)
```
1. Implement superuser bypass in can_manage_course()
2. Demote instructor
3. Admin can manage courses directly
4. Transfer to new instructors when ready
```

### Option 3: Auto-Transfer on Demotion
```python
# In demote_from_staff endpoint:
def demote_from_staff(request, user_id):
    user = User.objects.get(id=user_id)
    
    # Get courses they own
    owned_courses = Course.objects.filter(course_owner=user)
    
    if owned_courses.exists():
        # Option A: Prevent demotion
        return Response({
            'error': 'User owns courses. Transfer ownership first.',
            'courses': [c.name for c in owned_courses]
        }, status=400)
        
        # Option B: Auto-transfer to requesting admin
        for course in owned_courses:
            course.course_owner = request.user  # Admin takes ownership
            course.save()
    
    user.is_staff = False
    user.save()
```

---

## 🗑️ **What if Instructor Account is DELETED?**

### Course Model Field Definition:
```python
course_owner = models.ForeignKey(
    User, 
    on_delete=models.SET_NULL,  # ⚠️ Key behavior
    null=True, 
    blank=True
)
```

### What Happens:
1. **Course owner becomes NULL**
   - `course.course_owner = None`
   - Course becomes "orphaned"

2. **Students Still Unaffected**
   - CourseEnrollments remain
   - Tool access continues

3. **Admin Must Act**
   - Must assign new owner
   - Or manage directly (with superuser bypass)

4. **Registration Codes**
   ```python
   used_by = models.ForeignKey(
       User,
       on_delete=models.SET_NULL,  # Also becomes NULL
       null=True
   )
   ```
   - Codes remain valid
   - "Used by" field becomes NULL
   - Historical record partially lost

---

## 🎯 **Summary Matrix**

| Action | Student Experience | Course Status | Admin Can Manage? | Solution |
|--------|-------------------|---------------|-------------------|----------|
| **Demote Instructor** | ✅ Unaffected | ⚠️ Orphaned | ❌ No (currently) | Transfer ownership OR implement superuser bypass |
| **Delete Instructor** | ✅ Unaffected | ⚠️ Owner=NULL | ❌ No (currently) | Implement superuser bypass, assign new owner |
| **Transfer Ownership** | ✅ Unaffected | ✅ Active | ✅ New owner | Recommended before demotion |

---

## 📝 **Implementation Checklist**

To fully support instructor management:

- [ ] Implement superuser bypass in `can_manage_course()`
- [ ] Create admin user management endpoints (see ADMIN_ENDPOINTS_NEEDED.md)
- [ ] Add warning when demoting instructor with courses
- [ ] Add "View Courses" button for instructors in user management UI
- [ ] Add course transfer modal in admin dashboard
- [ ] Consider audit logging for ownership transfers
- [ ] Test student experience after instructor demotion
- [ ] Document procedure for handling departed instructors

---

## 🔍 **Testing Scenarios**

### Test 1: Demote Instructor with Active Course
```
1. Instructor has 30 students in "Marketing Analytics"
2. Admin demotes instructor to student
3. Verify:
   - Students can still use tools ✓
   - Students can still take quizzes ✓
   - Instructor cannot access instructor dashboard ✓
   - Instructor cannot manage course ✓
   - Course appears in admin's course list ✓
   - Admin can transfer course to new instructor ✓
```

### Test 2: Admin Direct Management (with bypass)
```
1. Implement superuser bypass
2. Instructor demoted
3. Admin accesses course directly
4. Admin can view codes, generate new codes, etc. ✓
```

### Test 3: Registration Code Usage After Demotion
```
1. Instructor demoted
2. New student tries to register with course code
3. Verify registration succeeds ✓
4. Student can use tools normally ✓
```

---

**Bottom Line**: Students are completely unaffected by instructor status changes. The main issue is who manages orphaned courses—which admins can handle with the superuser bypass.
