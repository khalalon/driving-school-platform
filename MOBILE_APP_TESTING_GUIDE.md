# 📱 MOBILE APP TESTING GUIDE

**Platform**: React Native with Expo
**Status**: Ready to Test
**Last Updated**: 2025-12-27

---

## 🚀 QUICK START - TEST YOUR MOBILE APP

### Prerequisites

1. **Install Expo Go on your phone**:
   - **iOS**: App Store → Search "Expo Go"
   - **Android**: Google Play → Search "Expo Go"

2. **Your phone and computer must be on the same WiFi network**

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### Step 1: Start the Mobile App

Open terminal/command prompt and run:

```bash
cd "c:\Users\Dev\OneDrive - YELLOWSYS\Bureau\Nouveau dossier (2)\driving-school-platform\mobile-app"
npm start
```

### Step 2: Wait for Expo to Start

You'll see something like:

```
› Metro waiting on exp://192.168.x.x:19000
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Android configured! Use adb -s <device> reverse tcp:8081 tcp:8081
› Press a | open Android
› Press i | open iOS simulator
› Press w | open web
› Press r | reload app
› Press d | toggle dev menu
```

### Step 3: Open on Your Phone

**Option A - QR Code (Easiest)**:
1. Open Expo Go app on your phone
2. Scan the QR code shown in terminal
3. Wait for app to load

**Option B - Manual URL**:
1. In Expo Go, type the URL shown (e.g., `exp://192.168.x.x:19000`)
2. Press Enter/Go

### Step 4: Allow Permissions

When prompted, allow:
- Camera (for scanning QR codes if needed)
- Location (if features require it)
- Notifications (for push notifications)

---

## 🎯 WHAT YOU CAN TEST

### Screens Available

#### 1. **Authentication Screens**

**Login Screen**:
- Email input field
- Password input field
- Login button
- Link to registration

**Register Screen**:
- Email field
- Password field
- Role selection (Student/Instructor)
- Register button

#### 2. **Student Screens**

**Student Dashboard**:
- Welcome message
- Quick stats
- Navigation tabs
- Quick actions

**Schools List**:
- List of all driving schools
- School details (name, address, phone, email)
- View school details
- Request enrollment button

**School Detail Screen**:
- Full school information
- Instructor list
- Available lessons
- Reviews/ratings

**Lessons List**:
- All available lessons
- Filter by school/instructor
- Book lesson button

**Book Lesson Screen**:
- Select date/time
- Choose lesson type
- Confirm booking

**My Lessons Screen**:
- Scheduled lessons
- Completed lessons
- Cancel option

**Exams List**:
- Upcoming exams
- Exam details
- Register button

**My Exams Screen**:
- Registered exams
- Exam results
- Scores

**Profile Screen**:
- User information
- Edit profile
- Settings
- Logout

#### 3. **Instructor Screens**

**Instructor Dashboard**:
- Today's schedule
- Pending requests
- Quick stats

**Today's Lessons Screen**:
- List of scheduled lessons
- Student information
- Mark complete button

**Today's Exams Screen**:
- Scheduled exams
- Student list
- Grade exam option

**Enrollment Requests Screen**:
- Pending enrollment requests
- Approve/reject buttons
- Student details

**Lesson Requests Screen**:
- Lesson booking requests
- Accept/decline options
- Time slot info

**Student Profile Screen**:
- Student information
- Progress tabs (Info, Lessons, Exams)
- Lesson history
- Exam results

---

## 🧪 COMPLETE TESTING SCENARIO

### Test 1: Student Registration Flow

1. **Open the app** on your phone
2. **You'll see**: Login screen
3. **Tap**: "Don't have an account? Register"
4. **Fill in form**:
   - Email: `student@test.com`
   - Password: `Student123@`
   - Role: **Student** (select from dropdown)
5. **Tap**: Register button
6. **Expected**: Success message, redirected to login

### Test 2: Student Login Flow

1. **On Login screen**:
   - Email: `student@test.com` (or your registered email)
   - Password: `Student123@`
2. **Tap**: Login button
3. **Expected**: Navigate to Student Dashboard
4. **Verify**: You see your email/username

### Test 3: Browse Schools

1. **From Dashboard**, tap "Schools" tab
2. **You'll see**: List of 3 schools
3. **Tap on any school** to see details
4. **Scroll down** to see full information
5. **Tap**: "Request Enrollment" button
6. **Expected**: Confirmation message

### Test 4: View Lessons

1. **From Dashboard**, tap "Lessons" tab
2. **You'll see**: Available lessons
3. **Scroll** through the list
4. **Tap** on a lesson to see details
5. **Tap**: "Book Lesson" button
6. **Select**: Date and time
7. **Tap**: "Confirm Booking"
8. **Expected**: Success message

### Test 5: Check Exams

1. **From Dashboard**, tap "Exams" tab
2. **You'll see**: Upcoming exams
3. **Tap** on an exam for details
4. **Tap**: "Register" button
5. **Expected**: Registration confirmed

### Test 6: View Profile

1. **From Dashboard**, tap "Profile" tab
2. **You'll see**:
   - Your email
   - Your role
   - Your information
3. **Tap**: Logout button
4. **Expected**: Returned to login screen

---

## 🔧 TROUBLESHOOTING

### Issue: "Connection Refused"

**Problem**: App can't connect to backend

**Solution**:
1. Check backend is running: `docker-compose ps`
2. Verify API URL in `.env` file
3. Update `.env` with your computer's IP:
   ```
   API_BASE_URL=http://YOUR_COMPUTER_IP:80
   ```
4. Find your IP:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac: `ifconfig` or hold Option + click WiFi icon
5. Restart Expo: Press `Ctrl+C`, then `npm start` again

### Issue: "QR Code Not Scanning"

**Solution**:
1. Make sure Expo Go is open
2. Hold phone steady about 6-12 inches from QR code
3. Ensure good lighting
4. Try manual URL entry instead

### Issue: "App Not Loading"

**Solution**:
1. Check Expo is running in terminal
2. Look for error messages in terminal
3. Close Expo Go completely and reopen
4. Try scanning QR code again
5. Clear cache in Expo Go: Dev Menu → Clear Cache

### Issue: "Screen Stuck on Loading"

**Solution**:
1. Shake phone (or tap menu in Expo Go)
2. Select "Reload" from dev menu
3. Or press `r` in terminal where Expo is running

### Issue: "Can't See All Schools/Lessons"

**Solution**:
1. Pull down to refresh (pull-to-refresh)
2. Check backend is running
3. Check your network connection
4. Look at terminal for API errors

---

## 📱 TESTING CHECKLIST

Use this checklist to verify everything works:

### Authentication
- [ ] Can register as student
- [ ] Can register as instructor
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong credentials
- [ ] Can logout
- [ ] Token persists after app restart

### Navigation
- [ ] All tabs work
- [ ] Can navigate between screens
- [ ] Back button works
- [ ] Navigation is smooth

### Schools
- [ ] Schools list loads
- [ ] Can see school details
- [ ] Can request enrollment
- [ ] Pull-to-refresh works

### Lessons
- [ ] Lessons list loads
- [ ] Can see lesson details
- [ ] Can book lesson
- [ ] My lessons show bookings

### Exams
- [ ] Exams list loads
- [ ] Can see exam details
- [ ] Can register for exam
- [ ] My exams show registrations

### Profile
- [ ] Profile loads correctly
- [ ] User info displays
- [ ] Can logout
- [ ] Settings accessible

### UI/UX
- [ ] No crashes
- [ ] No freezing
- [ ] Screens render correctly
- [ ] Text is readable
- [ ] Buttons work
- [ ] Loading indicators show
- [ ] Error messages display

---

## 🎨 WHAT THE APP LOOKS LIKE

### Color Scheme
- **Primary**: Blue (#007AFF)
- **Secondary**: Light gray (#F2F2F7)
- **Success**: Green (#34C759)
- **Error**: Red (#FF3B30)
- **Background**: White/Gray

### Navigation
- **Tab bar** at bottom (Dashboard, Schools, Lessons, Exams, Profile)
- **Header** with screen title
- **Back button** on detail screens

### Components
- **Cards**: White with shadow
- **Buttons**: Blue with rounded corners
- **Lists**: Grouped and styled
- **Forms**: Clean inputs with labels
- **Modals**: For confirmations
- **Toasts**: For success/error messages

---

## 📊 REAL DATA YOU'LL SEE

### Schools (3 available)
1. **DriveWell** - 123 Main St
2. **Master Driving Academy** - 456 Oak Avenue
3. **Academy Driving School** - 123 Main Street

### Lessons
- Various driving lessons
- Different durations (30, 60, 90 minutes)
- Different prices ($30-$100)
- Different instructors

### Exams
- Scheduled exams
- Different dates and times
- Passing scores
- Duration information

---

## 🚀 DEVELOPER OPTIONS

### Opening Dev Menu

**On Physical Device**:
- Shake the device
- Or tap menu in Expo Go app

**From Terminal**:
- Press `d` key
- Or press `m` key

### Dev Menu Options

- **Reload**: Restart the app
- **Reload JS**: Reload JavaScript only
- **Toggle Element Inspector**: Inspect UI elements
- **Show Debugger**: Open debug panel
- **Fast Refresh**: Enable fast refresh

### Remote Debugging

1. Open Dev Menu
2. Select "Debug Remote JS"
3. Opens in browser at `http://localhost:19001/debugger-ui/`
4. Use Chrome DevTools to debug

### Viewing Logs

**In Terminal**:
- All console.log() output appears here
- Errors and warnings show up
- Network requests visible

**In Browser** (if remote debugging):
- Chrome DevTools Console
- Network tab for API calls
- Sources tab for debugging

---

## 📝 SAMPLE WORKFLOWS

### Student Complete Journey

```
1. Register as Student
   ↓
2. Login to Dashboard
   ↓
3. Browse Schools (see 3 schools)
   ↓
4. Request Enrollment at preferred school
   ↓
5. Browse Available Lessons
   ↓
6. Book a Lesson
   ↓
7. View Upcoming Exams
   ↓
8. Register for Exam
   ↓
9. Check My Lessons (see booking)
   ↓
10. Check My Exams (see registration)
    ↓
11. View Profile
    ↓
12. Logout
```

### Instructor Complete Journey

```
1. Register as Instructor
   ↓
2. Login to Dashboard
   ↓
3. View Today's Lessons
   ↓
4. View Today's Exams
   ↓
5. Check Enrollment Requests
   ↓
6. Approve/Reject Students
   ↓
7. View Student Profiles
   ↓
8. Check Student Progress
   ↓
9. Logout
```

---

## 🔍 HOW TO VERIFY API CALLS

### In Terminal (where Expo is running)

Look for lines like:
```
[info] GET http://localhost/api/schools 200
[info] POST http://localhost/api/auth/login 200
```

### In Browser DevTools (Remote Debugging)

1. Start remote debugging from Dev Menu
2. Opens Chrome browser
3. Go to Console tab
4. See all console.log() output
5. Go to Network tab
6. See all API requests

### Common API Calls to Check

```javascript
// In your app code or browser console
fetch('http://localhost/api/schools')
  .then(r => r.json())
  .then(data => console.log('Schools:', data))

fetch('http://localhost/api/lessons')
  .then(r => r.json())
  .then(data => console.log('Lessons:', data))

fetch('http://localhost/api/exams')
  .then(r => r.json())
  .then(data => console.log('Exams:', data))
```

---

## ✅ SUCCESS CRITERIA

You'll know the app is working when:

✅ Expo starts without errors
✅ QR code appears in terminal
✅ App loads on your phone
✅ Can register new user
✅ Can login
✅ Dashboard displays
✅ Can navigate to all screens
✅ Schools list loads (3 schools)
✅ Lessons list loads
✅ Exams list loads
✅ Profile works
✅ Can logout
✅ No crashes or freezes
✅ API calls successful

---

## 💡 TIPS FOR TESTING

### Best Practices

1. **Test on Real Device**: Better than simulator
2. **Use Same WiFi**: Phone and computer on same network
3. **Keep Terminal Visible**: See logs and errors
4. **Test Both Roles**: Student and Instructor flows
5. **Test Offline Mode**: Turn off WiFi, see what happens
6. **Test Different Screens**: Try different phone sizes
7. **Test Performance**: Scroll fast, tap quickly
8. **Test Edge Cases**: Wrong passwords, empty fields, etc.

### Common Issues to Watch For

- Slow loading times
- Images not loading
- Navigation getting stuck
- Data not refreshing
- Buttons not responding
- Crashes on specific screens
- Memory issues (app slows down)

---

## 🎉 YOU'RE READY!

### Your Mobile App is:

✅ Built with React Native + Expo
✅ Connected to real backend
✅ Has all screens implemented
✅ Authentication working
✅ Real data from database
✅ Ready to test on your phone

---

## 📞 NEED HELP?

If something doesn't work:

1. **Check terminal** where Expo is running for errors
2. **Check Expo Go app** is updated
3. **Check backend services**: `docker-compose ps`
4. **Check your WiFi connection**
5. **Try restarting Expo**: Ctrl+C, then `npm start`
6. **Try clearing app cache** in Expo Go Dev Menu

---

**Happy Testing!** 📱🚗

**Last Updated**: 2025-12-27
**Version**: 1.0.0
**Status**: Ready for Testing
