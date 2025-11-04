# Recurring Appointments - Testing Guide

## 🎯 What Was Implemented

### Feature: Automatic Recurring Appointment Creation

When you set a check-up frequency (Monthly, Every 3 months, etc.) during Active Monitoring/Surveillance pathway transfer, the system now:

1. ✅ Creates the FIRST appointment on your chosen date/time
2. ✅ Automatically creates RECURRING appointments based on frequency
3. ✅ Schedules appointments for the next 12 months
4. ✅ All appointments appear in the calendar

### Appointment Frequency Logic:

| Frequency | Interval | Appointments Created (1 year) |
|-----------|----------|-------------------------------|
| Monthly | 1 month | 12 appointments |
| Every 3 months | 3 months | 4 appointments |
| Every 6 months | 6 months | 2 appointments |
| Annual | 12 months | 1 appointment |

## 🧪 How to Test

### Step 1: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 2: Open Browser & Dev Tools

1. Open `http://localhost:5173`
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Click the **Clear** button (🚫)

### Step 3: Login and Navigate

1. Login as **Urologist**
2. Go to **Patients** page
3. Click **View** on any patient
4. Click **"Transfer Pathway"** button

### Step 4: Fill Transfer Form

1. Select **"Active Monitoring"** or **"Active Surveillance"**
2. Fill in:
   - **Reason for Transfer**: "Test recurring appointments"
   - **Clinical Rationale**: "Testing frequency feature"
   
3. **IMPORTANT - Fill Schedule Follow-up section:**
   - **Date**: Pick a future date (e.g., 2025-12-01)
   - **Time**: Pick a time (e.g., 10:00)
   - **Check-up Frequency**: Select **"Monthly"** (for easy testing)

4. Optionally add **Additional Notes**

5. Click **"Confirm Transfer"**

### Step 5: Watch Console Logs

You should see logs like this:

```
🔍 Creating manual appointment BEFORE pathway transfer
📋 Patient data: {...}
👤 Current user: {...}
👤 Extracted urologist name: "Demo Doctor"
📤 Final appointment data being sent: {
  "appointmentDate": "2025-12-01",
  "appointmentTime": "10:00",
  "urologistId": 1,
  "urologistName": "Demo Doctor",
  "appointmentType": "urologist",
  ...
}
🚀 bookingService.bookUrologistAppointment called
✅ Booking successful
✅ Manual appointment created successfully
🔄 Creating 11 additional recurring appointments (every 1 month(s))
🔄 Creating recurring appointment 1/11 for 2026-01-01
✅ Recurring appointment 1 created successfully
🔄 Creating recurring appointment 2/11 for 2026-02-01
✅ Recurring appointment 2 created successfully
🔄 Creating recurring appointment 3/11 for 2026-03-01
✅ Recurring appointment 3 created successfully
...
✅ All recurring appointments processed
```

### Step 6: Verify Success Modal

The success modal should show:

```
Transfer Successful

Patient successfully transferred to Active Monitoring

✅ Follow-up appointments scheduled:
📅 First appointment: December 1, 2025
⏰ Time: 10:00
🔄 Frequency: Monthly
📊 Total appointments: 12 (for the next 12 months)
```

### Step 7: Check Calendar

1. Click **"Continue"** on success modal
2. Go to **Appointments** page
3. Navigate through months in the calendar

**Expected Result:**
- ✅ December 2025: Should show appointment on Dec 1
- ✅ January 2026: Should show appointment on Jan 1
- ✅ February 2026: Should show appointment on Feb 1
- ✅ ... and so on for 12 months

### Step 8: Check Database (Optional)

If you want to verify in database:

```sql
-- Check all appointments for the patient
SELECT 
  id, 
  appointment_date, 
  appointment_time, 
  urologist_name, 
  notes,
  status
FROM appointments 
WHERE patient_id = <YOUR_PATIENT_ID>
ORDER BY appointment_date;
```

You should see 12 appointments (if Monthly was selected).

## 🔍 Testing Different Frequencies

### Test Case 1: Monthly
- **Settings**: Frequency = Monthly
- **Expected**: 12 appointments over 12 months
- **Dates**: Dec 1, Jan 1, Feb 1, Mar 1, Apr 1, May 1, Jun 1, Jul 1, Aug 1, Sep 1, Oct 1, Nov 1

### Test Case 2: Every 3 Months
- **Settings**: Frequency = Every 3 months
- **Expected**: 4 appointments over 12 months
- **Dates**: Dec 1, Mar 1, Jun 1, Sep 1

### Test Case 3: Every 6 Months
- **Settings**: Frequency = Every 6 months
- **Expected**: 2 appointments over 12 months
- **Dates**: Dec 1, Jun 1

### Test Case 4: Annual
- **Settings**: Frequency = Annual
- **Expected**: 1 appointment
- **Dates**: Dec 1

## ✅ Success Criteria

### The feature works correctly if:

1. ✅ Console shows all appointments being created
2. ✅ No errors in console
3. ✅ Success modal shows correct total count
4. ✅ All appointments appear in calendar
5. ✅ Appointments are evenly spaced by the frequency interval
6. ✅ Each appointment has correct urologist name
7. ✅ Each appointment has descriptive notes
8. ✅ Database contains all appointments
9. ✅ Clinical note mentions the scheduled appointments

## 🐛 Troubleshooting

### Issue 1: "Only 1 appointment created"

**Check:**
- Console logs - does it show "Creating X additional recurring appointments"?
- Any errors during recurring appointment creation?

**Solution:**
- Check console for specific error messages
- Verify backend is accepting all appointment requests

### Issue 2: "Appointments not showing in calendar"

**Check:**
- Are you navigating to the correct future months?
- Are appointments in database?
- Is calendar filtering by urologist?

**Solution:**
- Go to Appointments page
- Click the arrows to navigate months
- Check December 2025, January 2026, etc.

### Issue 3: "Failed to create recurring appointment"

**Check:**
- Console shows specific error for which appointment failed
- Backend logs for conflict errors

**Possible Causes:**
- Time slot already booked
- Date validation issues
- Backend processing limits

## 📊 Expected Console Output Summary

For **Monthly** frequency:
```
✅ Manual appointment created successfully
🔄 Creating 11 additional recurring appointments
✅ Recurring appointment 1 created successfully
✅ Recurring appointment 2 created successfully
✅ Recurring appointment 3 created successfully
✅ Recurring appointment 4 created successfully
✅ Recurring appointment 5 created successfully
✅ Recurring appointment 6 created successfully
✅ Recurring appointment 7 created successfully
✅ Recurring appointment 8 created successfully
✅ Recurring appointment 9 created successfully
✅ Recurring appointment 10 created successfully
✅ Recurring appointment 11 created successfully
✅ All recurring appointments processed
```

## 📝 What to Report

If it doesn't work, please provide:

1. **Console Output**: Copy all logs from console
2. **Network Tab**: 
   - Filter by "appointments"
   - Check if multiple POST requests were made
   - Check responses for each
3. **Calendar Screenshots**: Show what appears in different months
4. **Database Query**: Results of the SQL query above
5. **Error Messages**: Any alerts or errors shown

## 🎯 Expected Database State

After creating Monthly frequency for patient ID 14 starting Dec 1, 2025:

```sql
SELECT appointment_date, appointment_time, notes, status 
FROM appointments 
WHERE patient_id = 14 
ORDER BY appointment_date;
```

Should return:

```
appointment_date | appointment_time | notes                                           | status
-----------------+------------------+-------------------------------------------------+-----------
2025-12-01       | 10:00:00        | Follow-up for Active Monitoring - Appt 1/12    | scheduled
2026-01-01       | 10:00:00        | Recurring follow-up - Appointment 2/12         | scheduled
2026-02-01       | 10:00:00        | Recurring follow-up - Appointment 3/12         | scheduled
2026-03-01       | 10:00:00        | Recurring follow-up - Appointment 4/12         | scheduled
2026-04-01       | 10:00:00        | Recurring follow-up - Appointment 5/12         | scheduled
2026-05-01       | 10:00:00        | Recurring follow-up - Appointment 6/12         | scheduled
2026-06-01       | 10:00:00        | Recurring follow-up - Appointment 7/12         | scheduled
2026-07-01       | 10:00:00        | Recurring follow-up - Appointment 8/12         | scheduled
2026-08-01       | 10:00:00        | Recurring follow-up - Appointment 9/12         | scheduled
2026-09-01       | 10:00:00        | Recurring follow-up - Appointment 10/12        | scheduled
2026-10-01       | 10:00:00        | Recurring follow-up - Appointment 11/12        | scheduled
2026-11-01       | 10:00:00        | Recurring follow-up - Appointment 12/12        | scheduled
```

## 💡 Important Notes

1. **Automatic creation happens in sequence** - First appointment → Then all recurring ones
2. **If one fails, others continue** - Designed to be resilient
3. **12-month window** - All appointments are created for the next year
4. **Same time for all** - All appointments use the same time you selected
5. **Same urologist** - All appointments assigned to current logged-in urologist

## ✨ Success!

If you see all appointments in the calendar across multiple months, **it's working perfectly!** 🎉





