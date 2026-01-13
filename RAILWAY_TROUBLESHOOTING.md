# Railway Deployment Troubleshooting Guide

## Problem: "Invalid discriminator value. Expected 'HELLO' | 'PING' | 'READY'"

This error means Railway is running **old backend code** that doesn't support all message types.

## Quick Diagnosis

### Step 1: Check Version Endpoint

After deployment, check:
```
https://your-backend.up.railway.app/version
```

**Expected response:**
```json
{
  "ok": true,
  "version": "1.0.0",
  "supportedMessageTypes": [
    "HELLO",
    "PING", 
    "READY",
    "PLAY",
    "PASS",
    "SET_RULES",
    "SYNC_REQUEST"
  ],
  "unsupportedMessageTypes": [],
  "totalSupported": 7,
  "expectedTotal": 7
}
```

**If you see only 3 types (HELLO, PING, READY):**
- ❌ Backend is running old code
- ✅ **Solution**: Follow steps below

## Root Causes & Solutions

### Cause 1: Railway Deploying from Wrong Directory

**Check:**
1. Railway Dashboard → Your Service → Settings → Source
2. **Root Directory** should be: **EMPTY** or `poker_backend`
3. Should **NOT** be: `poker_backend/apps/server`

**Fix:**
1. Settings → Source → Root Directory: **Clear it** (leave empty)
2. Settings → Build → Build Command: Verify it's:
   ```
   npm install && cd packages/rules && npm install && npm run build && cd ../../apps/server && npm install && npm run build
   ```
3. Settings → Deploy → Start Command: Verify it's:
   ```
   cd apps/server && npm start
   ```
4. Click **"Redeploy"**

### Cause 2: Build Cache Issue

**Fix:**
1. Railway Dashboard → Your Service → Settings → Build
2. Check "Clear build cache" or "Force rebuild"
3. Redeploy

### Cause 3: Code Not Pushed to GitHub

**Check:**
1. Verify latest code is committed:
   ```bash
   git status
   git log --oneline -5
   ```
2. Verify code is pushed:
   ```bash
   git push origin main
   ```

**Fix:**
```bash
cd poker_backend
git add .
git commit -m "Fix: Update Railway build configuration"
git push
```

### Cause 4: Railway Using Wrong Config File

Railway reads configs in this order:
1. `railway.json` (root)
2. `railway.toml` (root)
3. `nixpacks.toml` (if found)
4. Auto-detection

**Check:**
- Ensure `poker_backend/railway.json` exists and has correct build command
- Ensure `poker_backend/railway.toml` exists and has correct build command

### Cause 5: Build Failing Silently

**Check Railway Logs:**
1. Railway Dashboard → Your Service → Deployments
2. Click latest deployment
3. Check Build Logs

**Look for:**
- ✅ `Building rules package...`
- ✅ `Building server...`
- ✅ `Server listening on http://0.0.0.0:4000`
- ❌ Any errors or warnings

## Step-by-Step Fix

### Option A: Manual Railway Settings Update

1. **Go to Railway Dashboard**
2. **Select your backend service**
3. **Settings → Source:**
   - Root Directory: **EMPTY** (clear if set)
4. **Settings → Build:**
   - Build Command:
     ```
     npm install && cd packages/rules && npm install && npm run build && cd ../../apps/server && npm install && npm run build
     ```
5. **Settings → Deploy:**
   - Start Command:
     ```
     cd apps/server && npm start
     ```
6. **Click "Redeploy"**
7. **Wait for build to complete**
8. **Check `/version` endpoint**

### Option B: Force Rebuild via Git

1. **Make a small change to trigger rebuild:**
   ```bash
   cd poker_backend
   echo "# $(date)" >> .railway-version
   git add .railway-version
   git commit -m "Trigger Railway rebuild"
   git push
   ```

2. **Railway will auto-deploy**
3. **Check build logs**
4. **Verify `/version` endpoint**

## Verification Checklist

After redeploy, verify:

- [ ] `/health` returns `{"ok":true}`
- [ ] `/version` shows 7 supported message types
- [ ] Build logs show rules package being built
- [ ] Build logs show server being built
- [ ] No errors in build logs
- [ ] WebSocket connects successfully
- [ ] No "INVALID_MESSAGE" errors in frontend

## Still Not Working?

1. **Check Railway Logs** for runtime errors
2. **Compare local vs Railway:**
   - Local: `npm run build` in `poker_backend/`
   - Check `apps/server/dist/protocol.js` exists
   - Check it exports `ClientMessageSchema`
3. **Test locally:**
   ```bash
   cd poker_backend
   npm run build
   cd apps/server
   npm start
   ```
   Then test WebSocket - should work
4. **Contact Railway Support** if build logs show no errors but code is still old

## Prevention

To prevent this in the future:

1. **Always deploy from `poker_backend` root**
2. **Never set Root Directory to `apps/server`**
3. **Verify `/version` endpoint after each deploy**
4. **Keep `railway.json` and `railway.toml` in sync**
