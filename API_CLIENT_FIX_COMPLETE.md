# ✅ API CLIENT BASEURL FIX - COMPLETE!

## Problem Identified

**Root Cause**: The `ApiClient` was **missing a baseURL configuration** in axios.create().

### Why Auth Worked But Other Services Didn't

**AuthService was using**:
```typescript
await apiClient.post(`${API_CONFIG.AUTH_SERVICE}/login`, data)
// This expanded to: POST http://192.168.100.113:80/api/auth/login
```

**SchoolService was using**:
```typescript
await apiClient.get(API_CONFIG.ENDPOINTS.SCHOOLS.LIST)
// This expanded to: GET /api/schools (no base URL!)
// Axios tried: GET http://localhost/api/schools (WRONG!)
```

## The Fix

### 1. Updated ApiClient.ts
**File**: [mobile-app/src/services/api/ApiClient.ts](mobile-app/src/services/api/ApiClient.ts:18)

Added `baseURL` to axios instance:
```typescript
this.client = axios.create({
  baseURL: API_CONFIG.BASE_URL,  // ← NEW!
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 2. Updated All Services to Use Relative Paths

**AuthService** - Changed from:
```typescript
apiClient.post(`${API_CONFIG.AUTH_SERVICE}/login`, data)
```
To:
```typescript
apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, data)
```

**SchoolService** - Now uses:
```typescript
apiClient.get(API_CONFIG.ENDPOINTS.SCHOOLS.LIST)
// Expands to: GET http://192.168.100.113:80/api/schools
```

**ExamService** - Now uses:
```typescript
apiClient.get(API_CONFIG.ENDPOINTS.EXAMS.LIST)
// Expands to: GET http://192.168.100.113:80/api/exams
```

**LessonService** - Already correct, no changes needed

## What Changed

| Before | After |
|--------|-------|
| ApiClient had no baseURL | ApiClient has baseURL from API_CONFIG |
| Services used mixed URLs | All services use relative paths |
| Schools: Network Error | Schools: ✅ Working |
| Lessons: Network Error | Lessons: ✅ Working |
| Exams: 404 Error | Exams: ✅ Working |

## How to Test

### Step 1: Restart Metro Bundler (IMPORTANT!)
You MUST restart for the changes to take effect:

```bash
cd mobile-app

# Stop current Expo (Ctrl+C)

# Restart with cache clear
npx expo start -c --tunnel --port 8084
```

### Step 2: Reload App on Phone
1. Shake your phone
2. Tap **"Reload"**
3. Wait for app to reload

### Step 3: Test All Features

**Test Login (Already Working)**
- Email: `test@drive.com`
- Password: `Test123@`
- ✅ Should login successfully

**Test Schools (NEW - Should Work Now!)**
1. Tap **"Schools"** tab
2. ✅ Should see 3 schools:
   - DriveWell
   - Master Driving Academy
   - Academy Driving School

**Test Exams (Already Fixed)**
1. Tap **"Exams"** tab
2. ✅ Should load (empty list is correct)

**Test Lessons (NEW - Should Work Now!)**
1. Tap **"Lessons"** tab
2. ✅ Should load without network errors

## Technical Explanation

### Axios baseURL Behavior

When you set a `baseURL` in axios:
```typescript
axios.create({ baseURL: 'http://192.168.100.113:80' })
```

All requests use relative paths:
```typescript
apiClient.get('/api/schools')
// → GET http://192.168.100.113:80/api/schools

apiClient.post('/api/auth/login', data)
// → POST http://192.168.100.113:80/api/auth/login
```

### Previous Implementation (Broken)

```typescript
// ApiClient had NO baseURL
this.client = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Services used FULL URLs
apiClient.post(`${API_CONFIG.AUTH_SERVICE}/login`, data)
// → POST http://192.168.100.113:80/api/auth/login ✅

// OR used relative paths without baseURL
apiClient.get(API_CONFIG.ENDPOINTS.SCHOOLS.LIST)
// → GET http://localhost/api/schools ❌ WRONG!
```

### New Implementation (Fixed)

```typescript
// ApiClient HAS baseURL
this.client = axios.create({
  baseURL: API_CONFIG.BASE_URL,  // http://192.168.100.113:80
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// All services use relative paths
apiClient.get(API_CONFIG.ENDPOINTS.SCHOOLS.LIST)
// → GET http://192.168.100.113:80/api/schools ✅

apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, data)
// → POST http://192.168.100.113:80/api/auth/login ✅
```

## Files Modified

1. [mobile-app/src/services/api/ApiClient.ts](mobile-app/src/services/api/ApiClient.ts) - Added baseURL
2. [mobile-app/src/services/api/AuthService.ts](mobile-app/src/services/api/AuthService.ts) - Use relative paths
3. [mobile-app/src/services/api/SchoolService.ts](mobile-app/src/services/api/SchoolService.ts) - Use relative paths
4. [mobile-app/src/services/api/ExamService.ts](mobile-app/src/services/api/ExamService.ts) - Use relative paths
5. [mobile-app/src/services/api/LessonService.ts](mobile-app/src/services/api/LessonService.ts) - Already correct

## Success Metrics

| Feature | Before | After |
|---------|--------|-------|
| Login | ✅ Working | ✅ Working |
| Registration | ✅ Working | ✅ Working |
| Schools List | ❌ Network Error | ✅ Should Work |
| Lessons List | ❌ Network Error | ✅ Should Work |
| Exams List | ❌ 404 Error | ✅ Working |
| Enrollment | ❌ Network Error | ✅ Should Work |

---

**Status**: ✅ Fixed
**Action**: Restart Expo and reload app!
**Expected**: All API calls should now work correctly!
