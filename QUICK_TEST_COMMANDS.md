# ⚡ QUICK TEST - READ THIS FIRST!

## 🚨 CRITICAL: YOU MUST RESTART EXPO!

The changes WON'T work until you restart with cache cleared!

```bash
# Step 1: Stop Expo (Ctrl+C)

# Step 2: Restart with cache clear
cd mobile-app
npx expo start -c --tunnel --port 8084
```

## ✅ What Was Fixed

1. **Added baseURL to ApiClient** - Axios now knows where to send requests
2. **Hardcoded API URL** - No more relying on unreliable Expo Constants
3. **Added Debug Logging** - See exactly what URLs are being called
4. **Updated All Services** - Consistent relative paths across all services

## 📱 Quick Test Checklist

### 1. Login (Already Working ✅)
- Email: `test@drive.com`
- Password: `Test123@`

### 2. Browse Schools (NEW - Should Work! ✅)
- Tap "Browse Schools"
- Should see 3 schools

### 3. View My Lessons (NEW - Should Work! ✅)
- Tap "My Lessons"
- Should show "No lessons yet"

### 4. View My Exams (Already Fixed ✅)
- Tap "My Exams"
- Should show "No exams yet"

## 🔍 What to Check in Logs

When the app starts, you should see:
```
[API_CONFIG] BASE_URL: http://192.168.100.113:80
```

When you tap "Browse Schools":
```
[ApiClient] Request: GET http://192.168.100.113:80/api/schools
```

If you DON'T see these logs, the cache wasn't cleared!

## 🐛 If It Still Doesn't Work

1. **Check you used `-c` flag** (critical!)
2. **Check you shook phone and tapped "Reload"**
3. **Share the logs from Expo terminal**
4. **Share any error messages from phone**

## 📚 Full Guide

See [COMPREHENSIVE_TEST_GUIDE.md](COMPREHENSIVE_TEST_GUIDE.md) for detailed testing instructions!

---

**Status**: ✅ Code Fixed - Ready to Test!
**Action**: Restart Expo with `npx expo start -c`
