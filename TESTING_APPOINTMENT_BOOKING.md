# Testing Manual Appointment Booking - Debug Guide

## 🔧 CRITICAL FIX APPLIED

### Root Cause Identified and Fixed:
**The issue was a field name mismatch between frontend and backend!**

- ❌ Frontend was sending: `date`, `time`, `type`
- ✅ Backend expects: `appointmentDate`, `appointmentTime`, `appointmentType`

### Fix Applied:
Changed frontend to send correct field names matching backend expectations.

## Changes Made

### 1. Enhanced UrologistPatientDetailsModal.jsx
- **FIXED field name mismatch** - now sends `appointmentDate` and `appointmentTime`
- Added extensive logging to track data flow
- Added validation for all required fields before sending
- Multiple fallback options for extracting urologist name
- Better error messages showing exactly what's missing

### 2. Enhanced bookingService.js
- Added detailed request/response logging
- Logs show exactly what data is being sent to the backend
- Logs show full error responses from backend

## How to Test

### Step 1: Start the Application

```bash
# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend  
cd frontend
npm run dev
```

### Step 2: Open Browser Developer Tools
1. Open your browser (Chrome/Edge recommended)
2. Press F12 to open Developer Tools
3. Go to the **Console** tab
4. Clear the console (click the 🚫 icon)

### Step 3: Login and Navigate
1. Login as a urologist
2. Go to Patients page
3. Click "View" on any patient
4. Click "Transfer Pathway"
5. Select "Active Monitoring" or "Active Surveillance"

### Step 4: Fill the Form
1. Fill in "Reason for Transfer" (e.g., "Routine monitoring")
2. Fill in "Clinical Rationale" (e.g., "Patient suitable for active monitoring")
3. **IMPORTANT:** Fill in the Schedule Follow-up section:
   - **Date**: Pick a future date (e.g., 2025-12-15)
   - **Time**: Pick a time (e.g., 10:30)
   - **Check-up Frequency**: Select any option (e.g., "Every 3 months")
4. Click "Confirm Transfer"

### Step 5: Check Console Logs

Look for these log messages in order:

#### Expected Success Logs:
```
🔍 Creating manual appointment BEFORE pathway transfer
📋 Patient data: {id: ..., name: ..., upi: ...}
📋 Appointment booking state: {appointmentDate: "2025-12-15", appointmentTime: "10:30", notes: ""}
👤 Current user: {id: ..., firstName: ..., lastName: ..., ...}
👤 Extracted urologist name: "John Doe"
📤 Final appointment data being sent: {
  "date": "2025-12-15",
  "time": "10:30",
  "urologistId": 1,
  "urologistName": "John Doe",
  "type": "urologist",
  "notes": "Follow-up for Active Monitoring - Check-up frequency: Every 3 month(s)",
  "status": "confirmed",
  "patientName": "Test Patient",
  "upi": "URP20251234"
}
🔍 Patient ID for booking: 5
🚀 bookingService.bookUrologistAppointment called
📍 Patient ID: 5
📦 Appointment Data: {...}
🔗 Request URL: /booking/patients/5/appointments
✅ Booking successful, response: {...}
✅ Manual appointment created successfully
```

#### If Error Occurs - Check These Logs:
```
❌ Error booking urologist appointment: ...
❌ Error response data: {success: false, message: "..."}
❌ Error response status: 400
```

## Common Issues and Solutions

### Issue 1: "Urologist name could not be determined"
**Problem:** User profile doesn't have name fields
**Solution:**
```javascript
// Check in console what the currentUser object contains:
console.log('Current user:', authService.getCurrentUser());

// Check localStorage:
localStorage.getItem('user')
```

**Fix:** Update your user profile in the database to include `firstName` and `lastName`

### Issue 2: "Appointment date, time, urologist ID, and urologist name are required"
**Problem:** Data is not reaching the backend correctly
**Solution:** Check the console logs for:
1. What's in `📦 Appointment Data` - should show all fields
2. What the backend received - check Network tab

### Issue 3: Backend validation error
**Problem:** Backend has different field name expectations
**Solution:** 
1. Check Network tab → Click the failed `appointments` request
2. Go to "Request" tab to see what was sent
3. Go to "Response" tab to see the error message
4. Backend might expect different field names (e.g., `doctorId` instead of `urologistId`)

## What to Report Back

When testing, please provide:

1. **Console Logs:** Copy all logs between "Creating manual appointment" and the result
2. **Network Request Details:**
   - Open Network tab
   - Filter by "appointments"
   - Click the failed request
   - Screenshot or copy:
     - Request URL
     - Request Payload (Request tab)
     - Response (Response tab)
3. **User Data:** Run in console and copy output:
   ```javascript
   console.log(JSON.stringify(authService.getCurrentUser(), null, 2))
   ```

## Test Checklist

- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] Logged in as urologist
- [ ] Console is open and clear
- [ ] Network tab is recording
- [ ] Form filled completely (including date/time)
- [ ] Clicked "Confirm Transfer"
- [ ] Console logs captured
- [ ] Network request details captured

## Expected Behavior

### Success Case:
1. ✅ Appointment is created first
2. ✅ Pathway is transferred
3. ✅ Clinical note is created with appointment details
4. ✅ Success modal shows: "Follow-up appointment scheduled"
5. ✅ No automatic booking message appears

### Failure Case:
1. ❌ Appointment creation fails with specific error
2. 🛑 Alert shows: "Failed to schedule appointment: [error]. Pathway transfer has been cancelled."
3. ❌ Pathway transfer does NOT happen
4. ❌ Patient remains on current pathway
5. ✅ User can fix the issue and retry

## Debug Commands

Run these in browser console while on the page:

```javascript
// Check current user data
console.log('User:', authService.getCurrentUser());

// Check patient data
console.log('Patient:', patient);

// Check appointment booking state
console.log('Appointment state:', appointmentBooking);

// Check localStorage
console.log('Stored user:', JSON.parse(localStorage.getItem('user')));
```

## Next Steps

After testing:
1. If it works ✅ - Great! The issue is resolved
2. If it fails ❌ - Send me the console logs and network details
3. If error message is different - Send the exact error message

