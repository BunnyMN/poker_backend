# Deploying /version Endpoint

## Issue: 404 on /version endpoint

The `/version` endpoint is defined in the code but returns 404 on Railway. This means Railway is running old code.

## Solution: Force Redeploy

### Step 1: Verify Code is Committed

```bash
cd poker_backend
git status
git log --oneline -3
```

Make sure the latest code with `/version` endpoint is committed.

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Add /version endpoint for debugging"
git push origin main
```

### Step 3: Trigger Railway Deployment

**Option A: Automatic (if connected to GitHub)**
- Railway will auto-deploy when you push
- Wait for build to complete

**Option B: Manual Redeploy**
1. Railway Dashboard → Your Backend Service
2. Deployments tab
3. Click "Redeploy" or "Trigger Deploy"
4. Wait for build to complete

### Step 4: Verify Deployment

After deployment completes:

1. **Check Health:**
   ```
   https://pokerbackend-production-206d.up.railway.app/health
   ```
   Should return: `{"ok":true}`

2. **Check Version:**
   ```
   https://pokerbackend-production-206d.up.railway.app/version
   ```
   Should return JSON with supported message types

3. **Check Build Logs:**
   - Railway Dashboard → Deployments → Latest
   - Verify build completed successfully
   - Check for any errors

## Alternative: Check Without /version Endpoint

If you can't deploy immediately, you can still verify the backend by:

1. **Testing WebSocket directly:**
   - Connect to `wss://pokerbackend-production-206d.up.railway.app/ws`
   - Send a `PING` message
   - If it works, backend is running

2. **Check error messages:**
   - Try sending a `SYNC_REQUEST` message
   - If error says only "HELLO | PING | READY" → old code
   - If error says all 7 types → new code

## Quick Test Script

You can test the endpoint with curl:

```bash
# Health check
curl https://pokerbackend-production-206d.up.railway.app/health

# Version check (after deployment)
curl https://pokerbackend-production-206d.up.railway.app/version
```

## Expected /version Response

After successful deployment:

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
  "expectedTotal": 7,
  "nodeVersion": "v22.21.1",
  "timestamp": "2025-01-XX..."
}
```
