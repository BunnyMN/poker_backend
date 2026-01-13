# Railway Deployment Checklist

## ⚠️ CRITICAL: Deploy from Root Directory

**MUST deploy from `poker_backend/` root, NOT from `apps/server/`**

## Pre-Deployment Checklist

- [ ] Code is committed and pushed to GitHub
- [ ] Railway project is configured to deploy from `poker_backend` root directory
- [ ] Root Directory in Railway Settings → Source is empty or set to `poker_backend`
- [ ] Environment variables are set:
  - [ ] `SUPABASE_JWT_SECRET`
  - [ ] `PORT` (optional, Railway sets automatically)
  - [ ] `NODE_ENV=production` (optional)

## Build Process Verification

After deployment, check Railway logs. You should see:

1. ✅ `npm install` (root dependencies)
2. ✅ `cd packages/rules && npm install && npm run build` (rules package build)
3. ✅ `cd apps/server && npm install && npm run build` (server build)
4. ✅ `cd apps/server && npm start` (server start)

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-backend.up.railway.app/health
```
Expected: `{"ok":true}`

### 2. WebSocket Test
Use browser console or test page:
```javascript
const ws = new WebSocket('wss://your-backend.up.railway.app/ws');
ws.onopen = () => {
  console.log('✅ Connected');
  ws.send(JSON.stringify({ type: 'PING' }));
};
ws.onmessage = (e) => console.log('Received:', e.data);
```

### 3. Verify Message Types
If you get an error saying only `HELLO | PING | READY` are supported:
- ❌ Backend was deployed from wrong directory
- ❌ Rules package wasn't built
- ✅ **Solution**: Redeploy from `poker_backend` root

### 4. Check Logs
Railway Dashboard → Your Service → Logs:
- Should see: `Server listening on http://0.0.0.0:4000`
- Should NOT see: TypeScript compilation errors
- Should NOT see: Module not found errors for `@poker/rules`

## Common Issues

### Issue: "INVALID_MESSAGE" with only HELLO/PING/READY
**Cause**: Deployed from `apps/server` instead of root
**Fix**: 
1. Railway Settings → Source → Root Directory: Set to empty or `poker_backend`
2. Redeploy

### Issue: Build fails with "Cannot find module @poker/rules"
**Cause**: Rules package not built
**Fix**: Ensure build command includes rules package build step

### Issue: WebSocket connects but messages fail
**Cause**: Outdated backend code
**Fix**: 
1. Verify latest code is pushed to GitHub
2. Trigger new deployment
3. Wait for build to complete

## Railway Configuration Files

The following files control the build:
- `railway.json` (root) - Primary config
- `railway.toml` (root) - Alternative config
- `nixpacks.toml` (apps/server) - Fallback config

All should have the same build command that:
1. Builds rules package first
2. Then builds server
3. Starts from apps/server directory

## Quick Fix Command

If deployment is wrong, update Railway settings:
1. Go to Railway Dashboard
2. Select your backend service
3. Settings → Source → Root Directory: **Leave empty** (deploys from repo root)
4. Settings → Build → Build Command: 
   ```
   npm install && cd packages/rules && npm install && npm run build && cd ../../apps/server && npm install && npm run build
   ```
5. Settings → Deploy → Start Command:
   ```
   cd apps/server && npm start
   ```
6. Click "Redeploy"
