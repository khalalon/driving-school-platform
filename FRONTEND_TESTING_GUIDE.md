# Frontend Testing Guide - Complete Testing Instructions

**Date**: 2025-12-27
**Status**: ✅ **READY FOR TESTING**

---

## 🎯 Quick Start

### Option 1: Web Frontend (Recommended for Testing)

1. **Ensure backend is running**:
   ```bash
   cd "c:\Users\Dev\OneDrive - YELLOWSYS\Bureau\Nouveau dossier (2)\driving-school-platform"
   docker-compose up -d
   ```

2. **Start web frontend**:
   ```bash
   cd web-frontend
   npm run dev
   ```

3. **Open browser**:
   ```
   http://localhost:5173
   ```

### Option 2: Mobile App (React Native)

1. **Install Expo CLI** (if not installed):
   ```bash
   npm install -g expo-cli
   ```

2. **Start mobile app**:
   ```bash
   cd mobile-app
   npm start
   ```

3. **Scan QR code** with Expo Go app on your phone

---

## 📋 Complete Testing Checklist

### 1. Backend Services Verification

```bash
# Check all services are running
docker-compose ps

# Expected output: 11 containers running (8 services + db + redis + gateway)
```

**Manual Health Checks**:
```bash
# Test each service
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # School
curl http://localhost:3003/health  # Lesson
curl http://localhost:3004/health  # Exam
curl http://localhost:3005/health  # Payment
curl http://localhost:3006/health  # Notification
curl http://localhost:3007/health  # Student
curl http://localhost:3008/health  # Analytics

# Test gateway
curl http://localhost/health
```

---

### 2. Web Frontend Testing

#### Step 1: Open Application

1. **URL**: `http://localhost:5173`
2. **Default page**: Login page

#### Step 2: Test Registration

1. Click "Don't have an account? Register"
2. Fill in the form:
   - Email: `test@example.com`
   - Password: `TestPass@123`
   - Role: `student`
3. Click "Register"
4. **Expected**: Redirected to login page with success message

#### Step 3: Test Login

1. Enter credentials:
   - Email: `test@example.com`
   - Password: `TestPass@123`
2. Click "Sign in"
3. **Expected**: Redirected to dashboard

#### Step 4: Test Dashboard

**Verify**:
- Welcome message displayed
- User email shown in top right
- Navigation menu visible (Dashboard, Schools, Lessons, Exams, Profile)
- Stats cards showing (Enrollments, Role, Email)
- Getting started guide visible

#### Step 5: Test Schools Page

1. Click "Schools" in navigation
2. **Verify**:
   - List of schools displayed
   - Each school shows: name, address, phone, email
   - "Request Enrollment" button on each card

**Sample Schools Expected**:
- DriveWell (123 Main St)
- Master Driving Academy (456 Oak Avenue)
- Academy Driving School (123 Main Street)

#### Step 6: Test Lessons Page

1. Click "Lessons" in navigation
2. **Verify**:
   - List of available lessons
   - Each lesson shows: title, description, duration, price
   - "Book Now" button on each lesson

#### Step 7: Test Exams Page

1. Click "Exams" in navigation
2. **Verify**:
   - List of upcoming exams
   - Each exam shows: title, date, duration
   - "Register" button

#### Step 8: Test Profile Page

1. Click "Profile" in navigation
2. **Verify**:
   - User email displayed
   - Role displayed (student/instructor/admin)
   - User ID displayed

#### Step 9: Test Logout

1. Click "Logout" button in top right
2. **Expected**: Redirected to login page
3. Verify localStorage cleared (open browser DevTools → Application → Local Storage)

---

### 3. API Integration Testing

Open Browser DevTools (F12) and test:

#### Test 1: Get Schools (Public)

```javascript
// In browser console
fetch('http://localhost/api/schools')
  .then(r => r.json())
  .then(data => console.log('Schools:', data))

// Expected: Array of 3 schools
```

#### Test 2: Register New User

```javascript
fetch('http://localhost/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'testuser@example.com',
    password: 'TestPass@123',
    role: 'student'
  })
})
  .then(r => r.json())
  .then(data => {
    console.log('Token:', data.accessToken);
    localStorage.setItem('accessToken', data.accessToken);
  })

// Expected: { accessToken: "...", refreshToken: "..." }
```

#### Test 3: Get Protected Resource

```javascript
fetch('http://localhost/api/profiles', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
  .then(r => r.json())
  .then(data => console.log('Profiles:', data))

// Expected: Array of profiles or 401 if not authorized
```

---

### 4. Mobile App Testing (Optional)

#### Prerequisites

1. Install Expo Go on your phone:
   - iOS: App Store
   - Android: Google Play Store

2. Update `.env` file in mobile-app:
   ```
   API_BASE_URL=http://YOUR_LOCAL_IP:80
   ```
   Replace `YOUR_LOCAL_IP` with your computer's IP address

#### Testing Steps

1. **Start mobile app**:
   ```bash
   cd mobile-app
   npm start
   ```

2. **Scan QR code** with Expo Go app

3. **Test Screens**:
   - Login Screen
   - Register Screen
   - Student Dashboard
   - Schools List
   - Lessons List
   - Exams List

4. **Test Navigation**:
   - Tab navigation between screens
   - Back button functionality
   - Flow between screens

---

### 5. Cross-Service Workflow Testing

#### Complete User Journey Test

1. **Register as Student**
   - Email: `student@test.com`
   - Password: `Student@123`
   - Role: `student`

2. **Login**
   - Use registered credentials

3. **Browse Schools**
   - Navigate to Schools page
   - View available schools

4. **Request Enrollment**
   - Click "Request Enrollment" on a school
   - Verify request created

5. **Browse Lessons**
   - Navigate to Lessons page
   - View available lessons

6. **Book a Lesson** (if implemented)
   - Click "Book Now" on a lesson
   - Select date/time
   - Confirm booking

7. **View Exams**
   - Navigate to Exams page
   - View upcoming exams

8. **Register for Exam** (if implemented)
   - Click "Register"
   - Confirm registration

9. **Check Profile**
   - Navigate to Profile page
   - Verify user information

10. **Logout**
    - Click logout button
    - Verify redirected to login

---

## 🐛 Troubleshooting

### Issue: "Network Error"

**Solution**:
1. Check backend services are running:
   ```bash
   docker-compose ps
   ```
2. Verify API gateway:
   ```bash
   curl http://localhost/health
   ```
3. Check browser console for detailed error

### Issue: "401 Unauthorized"

**Solution**:
1. Token may have expired
2. Clear localStorage and login again
3. In browser console:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

### Issue: "CORS Error"

**Solution**:
1. Backend CORS may not be configured
2. Check service logs:
   ```bash
   docker-compose logs auth
   ```
3. Verify CORS origins include `http://localhost:5173`

### Issue: "Page Not Found"

**Solution**:
1. Check Vite server is running on port 5173
2. Try accessing: `http://localhost:5173`
3. Restart dev server:
   ```bash
   cd web-frontend
   npm run dev
   ```

### Issue: "Styles Not Loading"

**Solution**:
1. Check Tailwind CSS is installed:
   ```bash
   cd web-frontend
   npm list tailwindcss
   ```
2. Verify `index.css` imports Tailwind:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. Clear browser cache and reload

---

## 📊 Testing Results Template

Use this template to document your testing:

```
## Test Results - [Date]

### Environment
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari/Edge]
- Backend Status: [Running/Not Running]
- Web Frontend: [Running on port 5173]

### Test Results

#### Authentication
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Token persistence works

#### Navigation
- [ ] Dashboard accessible
- [ ] Schools page works
- [ ] Lessons page works
- [ ] Exams page works
- [ ] Profile page works

#### API Integration
- [ ] Can fetch schools
- [ ] Can fetch lessons
- [ ] Can fetch exams
- [ ] Auth token works
- [ ] Protected routes work

#### UI/UX
- [ ] Responsive design works
- [ ] Loading states work
- [ ] Error messages display
- [ ] Navigation is smooth

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Status
✅ PASS / ❌ FAIL

### Notes
[Additional notes]
```

---

## 🎓 Testing Best Practices

1. **Test in multiple browsers**: Chrome, Firefox, Edge, Safari
2. **Test responsive design**: Resize browser window
3. **Test error cases**:
   - Invalid login credentials
   - Network errors (stop backend)
   - Expired tokens
4. **Check browser console** for errors
5. **Monitor Network tab** in DevTools to see API calls
6. **Test localStorage** behavior
7. **Test mobile view** using browser dev tools

---

## 📱 Mobile Testing (Advanced)

If you want to test the React Native mobile app:

1. **Install dependencies**:
   ```bash
   cd mobile-app
   npm install
   ```

2. **Update API URL** in `.env`:
   ```
   API_BASE_URL=http://YOUR_COMPUTER_IP:80
   ```

3. **Find your IP**:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

4. **Start Expo**:
   ```bash
   npm start
   ```

5. **On your phone**:
   - Open Expo Go app
   - Scan QR code
   - Wait for app to load

---

## 🚀 Next Steps After Testing

Once testing is complete:

1. **Document any issues found**
2. **Fix critical bugs**
3. **Add missing features**
4. **Improve UI/UX**
5. **Add more tests**
6. **Deploy to production**

---

## 📞 Support

If you encounter issues:

1. Check **Docker logs**: `docker-compose logs [service-name]`
2. Check **browser console**: F12 → Console
3. Check **Network tab**: F12 → Network
4. Review **API responses** in Network tab
5. Check **environment variables**: `.env` files

---

## ✅ Testing Complete Checklist

- [ ] Backend services running
- [ ] Web frontend accessible at http://localhost:5173
- [ ] Can register new user
- [ ] Can login with registered user
- [ ] Dashboard loads correctly
- [ ] Can browse schools
- [ ] Can browse lessons
- [ ] Can browse exams
- [ ] Can view profile
- [ ] Can logout
- [ ] API calls working (check Network tab)
- [ ] No console errors
- [ ] UI displays correctly
- [ ] Responsive design works

**When all checkboxes are checked, testing is complete!** 🎉

---

**Last Updated**: 2025-12-27
**Frontend Version**: 1.0.0
**Backend Version**: 1.0.0
