# ✅ Notification System - Testing Checklist

## 🎯 Quick Start Testing

### 1. ✅ Verify Servers are Running
```bash
# Check backend (should show Node.js processes)
Get-Process -Name node

# Test backend API
curl http://localhost:5000/api/health

# Test frontend
Open browser: http://localhost:3000
```

### 2. ✅ Test Patient Transfer → Notification

**Steps:**
1. Login as **Urologist** at http://localhost:3000/login
2. Navigate to **Patients** page
3. Select any patient referred by a GP
4. Click **"View"** button
5. In patient modal, click **"Transfer Patient"**
6. Select **"Active Monitoring"** or **"Medication"**
7. Enter reason: "Patient suitable for pathway"
8. Click **"Confirm Transfer"**

**Expected Backend Console Logs:**
```
[updatePatientPathway] Patient transferred to Active Monitoring - Auto-booking follow-up...
[updatePatientPathway] ✅ Auto-booked appointment for URP20251234 on 2026-02-03 at 10:00 with Dr. Thompson
[updatePatientPathway] ✅ Created clinical note for URP20251234 - Transfer to Active Monitoring
[updatePatientPathway] Sending notification to referring GP...
[updatePatientPathway] ✅ Notification email sent to GP: gp@example.com
[updatePatientPathway] Creating in-app notification for GP...
✅ Notification created for user 5: Patient Transferred to Active Monitoring
[updatePatientPathway] ✅ In-app notification created for GP
```

### 3. ✅ Test GP Notification Modal

**Steps:**
1. Logout from Urologist account
2. Login as **GP** (the doctor who referred the patient)
3. Look at notification bell icon - should show badge with number
4. Click the **notification bell icon** 
5. Notification modal opens

**Expected Results:**
```
✅ Modal header shows "Notifications"
✅ Unread count displayed (e.g., "4 unread notifications")
✅ "All" and "Unread" tabs visible
✅ Loading spinner appears briefly
✅ Notifications load from API
✅ Pathway transfer notification visible with:
   - Transfer icon (arrows icon)
   - Teal background
   - Title: "Patient Transferred to Active Monitoring"
   - Message includes patient name, urologist, reason
   - Time ago (e.g., "Just now", "5 minutes ago")
   - Green unread dot on the right
```

### 4. ✅ Test Mark as Read

**Steps:**
1. In notification modal, click on any **unread notification**
2. Observe the changes

**Expected Results:**
```
✅ Unread dot disappears
✅ Background changes from blue-tinted to white
✅ Unread count decreases by 1
✅ Notification stays in "All" tab
✅ Notification disappears from "Unread" tab
```

### 5. ✅ Test Mark All as Read

**Steps:**
1. With multiple unread notifications
2. Click **"Mark all as read"** button at top

**Expected Results:**
```
✅ All unread dots disappear
✅ All notifications background turns white
✅ Unread count shows "0 unread notifications"
✅ "Unread" tab shows empty state
```

### 6. ✅ Test Filter Tabs

**Steps:**
1. Click **"All"** tab
2. Click **"Unread"** tab

**Expected Results:**
```
✅ "All" shows all notifications (read + unread)
✅ "Unread" shows only unread notifications
✅ Count next to tab name is accurate
✅ Switching is instant (no loading)
```

### 7. ✅ Test Empty States

**Steps:**
1. Mark all notifications as read
2. Switch to "Unread" tab

**Expected Results:**
```
✅ Bell icon with "No notifications to display"
✅ Gray text
✅ Centered message
✅ No errors
```

### 8. ✅ Test Error Handling

**Steps:**
1. Stop backend server
2. Open notification modal

**Expected Results:**
```
✅ Loading spinner appears
✅ Error message displayed: "Failed to load notifications"
✅ Exclamation icon shown
✅ "Retry" button available
✅ Click retry attempts to reload
✅ No crash or white screen
```

---

## 🔍 API Testing (Optional - using Postman or curl)

### Test 1: Get Notifications
```bash
# Get auth token first by logging in
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gp@example.com","password":"password"}'

# Use token to get notifications
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected response:
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 4
  }
}
```

### Test 2: Mark as Read
```bash
curl -X PATCH http://localhost:5000/api/notifications/1/read \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected response:
{
  "success": true,
  "data": {
    "id": 1,
    "is_read": true,
    "read_at": "2025-11-03T..."
  }
}
```

### Test 3: Mark All as Read
```bash
curl -X PATCH http://localhost:5000/api/notifications/mark-all-read \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected response:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## 🗄️ Database Verification

### Check Notifications Table
```sql
-- Connect to PostgreSQL database
psql -U postgres -d urology_db

-- View notifications table
\d notifications

-- Count notifications
SELECT COUNT(*) FROM notifications;

-- View recent notifications
SELECT id, user_id, type, title, is_read, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Check unread count for user
SELECT COUNT(*) 
FROM notifications 
WHERE user_id = 5 AND is_read = false;
```

---

## 📊 Success Criteria

### ✅ Backend
- [x] Notifications table created in database
- [x] API endpoints respond correctly
- [x] Notifications created on patient transfer
- [x] Both email AND in-app notification sent
- [x] Console logs show success messages
- [x] No server errors or crashes

### ✅ Frontend
- [x] Notification modal opens
- [x] Fetches real data from API
- [x] NO dummy data displayed
- [x] Loading state works
- [x] Error handling works
- [x] Mark as read works
- [x] Mark all as read works
- [x] Filter tabs work
- [x] Empty states display
- [x] No console errors

### ✅ Integration
- [x] Urologist transfers patient
- [x] GP receives email notification
- [x] GP receives in-app notification
- [x] GP can view in notification modal
- [x] GP can mark as read
- [x] Count updates correctly
- [x] End-to-end flow works

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to load notifications"
**Solution:**
- Check backend server is running (port 5000)
- Check database connection
- Check user is authenticated (valid token)
- Check browser console for CORS errors

### Issue 2: Notifications not appearing after transfer
**Solution:**
- Check patient has `referred_by_gp_id` set
- Check console logs for notification creation
- Check database for new notification record
- Refresh notification modal

### Issue 3: "Mark as read" not working
**Solution:**
- Check API endpoint is accessible
- Check authentication token is valid
- Check notification belongs to logged-in user
- Check network tab for API response

### Issue 4: Empty notification modal
**Solution:**
- Create test notification by transferring patient
- Check user ID matches GP who referred patient
- Check database has notifications for this user
- Check API returns data correctly

---

## 📈 Performance Checks

### Load Time Targets
- ✅ Notification modal opens: <200ms
- ✅ API fetch completes: <500ms
- ✅ Mark as read: <300ms
- ✅ UI updates: Instant (<50ms)

### Database Performance
- ✅ Query with 100 notifications: <100ms
- ✅ Mark as read update: <50ms
- ✅ Count unread query: <30ms

---

## ✅ Final Checklist

Before marking as complete, verify:

- [ ] Backend server starts without errors
- [ ] Frontend builds without errors
- [ ] Notifications table exists in database
- [ ] API endpoints are accessible
- [ ] Patient transfer creates notification
- [ ] Email AND in-app notification both sent
- [ ] GP can see notifications in modal
- [ ] Mark as read functionality works
- [ ] No dummy data in notification modal
- [ ] No console errors in browser
- [ ] No linter errors in code
- [ ] Documentation is complete

---

**🎉 If all items checked, system is PRODUCTION READY!**




