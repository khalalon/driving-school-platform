# 🔥 URGENT: Firewall Fix Required!

## Problem

Your phone **cannot** connect to `http://192.168.100.113:80` because **Windows Firewall** is blocking incoming connections on port 80.

## Evidence

- ✅ Backend works from computer: `curl http://192.168.100.113:80/api/schools` returns schools
- ✅ Nginx is listening on `0.0.0.0:80` (all interfaces)
- ✅ Phone and computer on same network (192.168.100.XXX)
- ❌ Phone shows "Network Error" when trying to load schools
- ❌ No requests from phone appear in nginx logs

## Solution

**You MUST run this PowerShell script as Administrator:**

```powershell
.\fix-firewall.ps1
```

### Step-by-Step:

1. **Open PowerShell as Administrator**
   - Press `Windows + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Navigate to project folder**
   ```powershell
   cd "c:\Users\Dev\OneDrive - YELLOWSYS\Bureau\Nouveau dossier (2)\driving-school-platform"
   ```

3. **Run the firewall fix script**
   ```powershell
   .\fix-firewall.ps1
   ```

4. **Confirm success**
   - You should see: "✓ Firewall rules added successfully"
   - Script will show the rules that were created

## After Fixing Firewall

### Option 1: Keep using Local IP (Recommended after firewall fix)

The app is already configured to use `http://192.168.100.113:80` - just reload it!

1. Shake your phone
2. Tap "Reload"
3. Try loading schools - should work!

### Option 2: Use Localtunnel (If firewall still blocks)

If the firewall fix doesn't work, revert to localtunnel:

1. Edit [mobile-app/app.json](mobile-app/app.json:29):
   ```json
   "API_BASE_URL": "https://fancy-numbers-glow.loca.lt"
   ```

2. Restart localtunnel:
   ```bash
   npx localtunnel --port 80
   ```

3. Update app.json with the new URL

4. Restart Expo: `npx expo start -c`

## How to Verify It's Working

### Test 1: From Computer (Already Working)
```bash
curl http://192.168.100.113:80/api/schools
```

### Test 2: From Phone's Browser
Open your phone's browser and go to:
```
http://192.168.100.113:80/health
```
Should return: `healthy`

### Test 3: In the App
1. Login with `test@drive.com` / `Test123@`
2. Tap "Schools" tab
3. Should see 3 schools!

## Why This Is Happening

**Windows Firewall Profile Settings:**
- Domain: Blocked (or Private/Public blocking)
- Private: Blocking port 80
- Public: Blocking port 80

Even though you "disabled" the firewall, **specific port rules** can still block traffic!

The fix-firewall.ps1 script creates explicit **ALLOW rules** for port 80 and 443.

## Alternative: Use ngrok (More Reliable Tunnel)

If firewall issues persist, use **ngrok** instead of localtunnel:

1. Install ngrok: https://ngrok.com/download
2. Sign up for free account: https://ngrok.com/signup
3. Run: `ngrok http 80`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update app.json with that URL

ngrok handles CORS better than localtunnel.

---

**Status**: ⏳ Waiting for you to run fix-firewall.ps1 as Administrator
**Next**: Run the script, then reload the app!
