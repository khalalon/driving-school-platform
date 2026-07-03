# 🎯 COMPREHENSIVE TESTING GUIDE
## Driving School Platform - Full Application Test

**Date**: 2025-12-29
**Status**: Ready for Testing

---

## ✅ CHANGES MADE

### 1. Fixed API Client Configuration
**File**: [mobile-app/src/services/api/ApiClient.ts](mobile-app/src/services/api/ApiClient.ts:18)

- Added `baseURL: API_CONFIG.BASE_URL` to axios instance
- Added debug logging for all requests
- Added detailed error logging

### 2. Hardcoded API URL
**File**: [mobile-app/src/config/api.config.ts](mobile-app/src/config/api.config.ts:9)

- Changed from `Constants.expoConfig?.extra?.API_BASE_URL` (unreliable)
- To hardcoded: `'http://192.168.100.113:80'`
- Added debug logging to verify URL at startup

### 3. Updated All Services to Use Relative Paths
- AuthService ✅
- SchoolService ✅
- ExamService ✅
- LessonService ✅
- EnrollmentService ✅

---

## 🚀 HOW TO RESTART (CRITICAL!)

**YOU MUST RESTART EXPO FOR CHANGES TO TAKE EFFECT!**

### Step 1: Stop Current Expo
Press `Ctrl+C` in the terminal where Expo is running

### Step 2: Restart with Cache Clear
```bash
cd mobile-app
npx expo start -c --tunnel --port 8084
```

**The `-c` flag is CRITICAL - it clears the cache!**

### Step 3: Reload App on Phone
1. Open Expo Go on your phone
2. Scan the QR code (or tap your saved project)
3. Wait for app to load
4. **Shake your phone** to open Dev Menu
5. Tap **"Reload"** (double tap with two fingers)

### Step 4: Check Logs
You should see these logs when the app starts:
```
[API_CONFIG] BASE_URL: http://192.168.100.113:80
[API_CONFIG] Constants.expoConfig?.extra?.API_BASE_URL: undefined
```

This confirms the hardcoded URL is being used!

---

## 🧪 TESTING CHECKLIST

### Test 1: User Login ✅

**Action**:
1. Open app
2. Enter email: `test@drive.com`
3. Enter password: `Test123@`
4. Tap Login

**Expected Result**:
- ✅ Login successful
- ✅ Redirected to Student Dashboard

**Debug Logs to Check**:
```
[ApiClient] Request: POST http://192.168.100.113:80/api/auth/login
```

---

### Test 2: View Schools List (NEW - Should Work Now!)

**Action**:
1. From dashboard, tap **"Browse Schools"**
2. Wait for schools to load

**Expected Result**:
- ✅ See 3 schools:
  1. **DriveWell** - 123 Main St
  2. **Master Driving Academy** - 456 Oak Avenue, Los Angeles, CA 90001
  3. **Academy Driving School** - 123 Main Street, New York, NY 10001

**Debug Logs to Check**:
```
[ApiClient] Request: GET http://192.168.100.113:80/api/schools
```

**If it fails**, check the logs for:
```
[ApiClient] Error: {
  message: "...",
  code: "...",
  url: "/api/schools",
  method: "GET"
}
```

---

### Test 3: View School Detail

**Action**:
1. From schools list, tap any school
2. View school details

**Expected Result**:
- ✅ See school details (name, address, phone, email)
- ✅ See "Request Enrollment" button

---

### Test 4: Request Enrollment

**Action**:
1. From school detail, tap **"Request Enrollment"**
2. Add optional message
3. Tap **"Send Request"**

**Expected Result**:
- ✅ "Enrollment request sent successfully"
- ✅ Can see request in "My Requests"

**Debug Logs to Check**:
```
[ApiClient] Request: POST http://192.168.100.113:80/api/enrollment/schools/{schoolId}/request
```

---

### Test 5: View My Lessons (NEW - Should Work Now!)

**Action**:
1. From dashboard, tap **"My Lessons"**
2. Wait for lessons to load

**Expected Result**:
- ✅ Screen loads without errors
- ✅ Shows "No lessons yet" message (empty list is correct!)

**Debug Logs to Check**:
```
[ApiClient] Request: GET http://192.168.100.113:80/api/lessons
```

---

### Test 6: View My Exams

**Action**:
1. From dashboard, tap **"My Exams"**
2. Wait for exams to load

**Expected Result**:
- ✅ Screen loads without errors
- ✅ Shows "No exams yet" message (empty list is correct!)

**Debug Logs to Check**:
```
[ApiClient] Request: GET http://192.168.100.113:80/api/exams/my-exams
```

---

### Test 7: Request Exam

**Action**:
1. From dashboard, tap **"Request Exam"**
2. Select exam type (THEORY or PRACTICAL)
3. Select preferred date
4. Add optional message
5. Tap **"Submit Request"**

**Expected Result**:
- ✅ "Exam request submitted successfully"
- ✅ Request appears in My Exams

---

## 🔍 DEBUGGING TROUBLESHOOTING

### If You Still See "Network Error"

#### 1. Check the Logs

**In your Expo terminal**, look for:
```
[API_CONFIG] BASE_URL: http://192.168.100.113:80
```

If you see a DIFFERENT URL, that's the problem!

#### 2. Check Request Logs

Look for lines like:
```
[ApiClient] Request: GET http://192.168.100.113:80/api/schools
```

If you DON'T see this log, the request is not being made!

#### 3. Check Error Logs

Look for:
```
[ApiClient] Error: {
  message: "Network Error",
  code: "ERR_NETWORK",
  url: "/api/schools",
  method: "GET"
}
```

#### 4. Test API from Computer

Open a NEW terminal and run:
```bash
curl http://192.168.100.113:80/api/schools
```

You should see JSON data with 3 schools!

---

## 📊 BACKEND API STATUS

All backend services are **HEALTHY** ✅

| Service | Status | Port | Endpoint |
|---------|--------|------|----------|
| Auth Service | ✅ Healthy | 3001 | /api/auth |
| School Service | ✅ Healthy | 3002 | /api/schools |
| Lesson Service | ✅ Healthy | 3003 | /api/lessons |
| Exam Service | ✅ Healthy | 3004 | /api/exams |
| Payment Service | ✅ Healthy | 3005 | /api/payments |
| Notification Service | ✅ Healthy | 3006 | /api/notifications |
| Student Service | ✅ Healthy | 3007 | /api/enrollment |
| Analytics Service | ✅ Healthy | 3008 | /api/analytics |
| Nginx Gateway | ⚠️ Unhealthy | 80 | All /api/* |

**Note**: Nginx shows as "unhealthy" in Docker but **IS WORKING** (we tested it!)

---

## 🎨 CURRENT DATA IN SYSTEM

### Schools (3)
1. **DriveWell**
   - Address: 123 Main St
   - Phone: +1-555-0001
   - Email: info@drivewell.com

2. **Master Driving Academy**
   - Address: 456 Oak Avenue, Los Angeles, CA 90001
   - Phone: +1-555-0104
   - Email: master@academy.com

3. **Academy Driving School**
   - Address: 123 Main Street, New York, NY 10001
   - Phone: +1-555-0103
   - Email: academy@drivingschool.com

### Test User
- **Email**: test@drive.com
- **Password**: Test123@
- **Role**: Student

### Lessons
- **Count**: 0 (empty)

### Exams
- **Count**: 0 (empty)

---

## 📱 EXPECTED BEHAVIOR

### What SHOULD Work Now

✅ **Login** - Already working
✅ **Registration** - Already working
✅ **Browse Schools** - Should work with hardcoded URL
✅ **View School Detail** - Should work
✅ **Request Enrollment** - Should work
✅ **View My Requests** - Should work
✅ **View My Lessons** - Should show empty list
✅ **View My Exams** - Should show empty list
✅ **Request Exam** - Should work
✅ **Request Lesson** - Should work

### What WON'T Work Yet (Needs More Data)

❌ **Book Lesson** - No instructors in system yet
❌ **View Lesson Details** - No lessons created yet
❌ **View Exam Results** - No exams scheduled yet

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: "Network Error" on ALL requests

**Cause**: Metro bundler cache has old configuration
**Solution**:
```bash
cd mobile-app
npx expo start -c --tunnel --port 8084
```

### Issue: Only Auth works, other endpoints fail

**Cause**: API Client doesn't have baseURL set
**Solution**: Check [mobile-app/src/services/api/ApiClient.ts](mobile-app/src/services/api/ApiClient.ts:18) for:
```typescript
baseURL: API_CONFIG.BASE_URL
```

### Issue: Login works but schools show "Network Error"

**Cause**: Expo Constants not loading config from app.json
**Solution**: We hardcoded the URL in api.config.ts

### Issue: Requests show in logs but not in nginx

**Cause**: Requests failing before reaching server (DNS, timeout, CORS)
**Solution**: Check firewall, verify network connectivity

---

## 📝 NEXT STEPS AFTER TESTING

### If Tests Pass ✅

1. **Add More Test Data**
   - Create instructors
   - Create lesson types
   - Create sample lessons

2. **Test Full Workflow**
   - Enrollment → Lesson Booking → Exam Request → Completion

3. **Polish UI**
   - Add loading states
   - Better error messages
   - Success confirmations

### If Tests Fail ❌

1. **Share Console Logs**
   - Copy ALL logs from Expo terminal
   - Include [API_CONFIG] logs
   - Include [ApiClient] Request/Error logs

2. **Share Nginx Logs**
   ```bash
   docker logs driving-school-nginx --tail 50
   ```

3. **Share Error Screenshots**
   - Take screenshot of phone with error
   - Show the Expo terminal logs

---

## 🎯 SUCCESS CRITERIA

The app is **FULLY FUNCTIONAL** when:

- ✅ User can login
- ✅ User can browse all 3 schools
- ✅ User can view school details
- ✅ User can request enrollment
- ✅ User can view their requests
- ✅ User can view lessons (empty list is OK)
- ✅ User can view exams (empty list is OK)
- ✅ User can request exam
- ✅ No "Network Error" messages

---

**Last Updated**: 2025-12-29
**Status**: Ready for Testing
**Action Required**: Restart Expo with `-c` flag and test!
