# Railway Deployment Guide

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. Railway CLI installed (optional, but recommended)
   ```bash
   npm i -g @railway/cli
   ```

## Deployment Steps

### Option 1: Deploy from Monorepo Root (Recommended)

1. **Create a New Project**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo" (point to `poker_backend` directory)

2. **Add Service**
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Railway will auto-detect Node.js

3. **Configure Build Settings** (IMPORTANT - Must build from root)
   - Go to Settings → Source
   - **Root Directory**: Leave empty or set to `poker_backend` (deploy from monorepo root)
   - Go to Settings → Build
   - Build Command: `npm install && cd packages/rules && npm install && npm run build && cd ../../apps/server && npm install && npm run build`
   - Start Command: `cd apps/server && npm start`
   - **Note**: Railway will use `railway.json` or `railway.toml` if present, which already have the correct commands
   - **CRITICAL**: Must deploy from `poker_backend` root directory, NOT from `apps/server`

4. **Set Environment Variables**
   - Go to Variables tab
   - Add the following:
     ```
     SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
     PORT=4000
     NODE_ENV=production
     ```

5. **Deploy**
   - Railway will automatically build and deploy
   - The build will compile both rules package and server

### Option 2: Deploy from Server Directory

1. **Create a New Project**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Add Service**
   - Click "New" → "GitHub Repo"
   - Select your repository

3. **Configure Root Directory**
   - Go to Settings → Source
   - Set Root Directory to: `poker_backend/apps/server`
   - **Note**: You'll need to manually build the rules package first or use a custom build command

4. **Set Environment Variables**
   - Go to Variables tab
   - Add the following:
     ```
     SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
     PORT=4000
     NODE_ENV=production
     ```

5. **Deploy**
   - Railway will automatically build and deploy

### Option 3: Using Railway CLI

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize Project** (from monorepo root)
   ```bash
   cd poker_backend
   railway init
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
   railway variables set PORT=4000
   railway variables set NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Environment Variables

Required environment variables:

- `SUPABASE_JWT_SECRET` - Your Supabase JWT secret (required)
- `PORT` - Server port (default: 4000, Railway will set this automatically)
- `NODE_ENV` - Set to `production` (optional but recommended)

## Build Configuration

**IMPORTANT**: Railway MUST deploy from the `poker_backend` root directory, NOT from `apps/server`.

Railway will automatically:
1. Install root dependencies: `npm install`
2. Build rules package: `cd packages/rules && npm install && npm run build`
3. Build server TypeScript: `cd apps/server && npm install && npm run build`
4. Start server: `cd apps/server && npm start`

The build process is defined in:
- `railway.json` (root)
- `railway.toml` (root)
- `nixpacks.toml` (apps/server - fallback)

**If deploying from wrong directory:**
- WebSocket messages may fail validation
- Rules package won't be built
- Server may start but game logic won't work

## WebSocket Configuration

Railway automatically handles WebSocket connections. Your WebSocket endpoint will be:
- `wss://your-app-name.up.railway.app/ws` (production)
- Or use the Railway-provided domain

## Health Check

Railway will use the `/health` endpoint for health checks:
- `GET https://your-app-name.up.railway.app/health`

## Monitoring

- View logs in Railway dashboard
- Set up alerts for deployment failures
- Monitor resource usage

## Troubleshooting

### Build Fails
- **CRITICAL**: Verify Railway is deploying from `poker_backend` root directory (Settings → Source → Root Directory should be empty or `poker_backend`)
- Check that `tsconfig.json` is correct
- Ensure all dependencies are in `package.json`
- Verify the monorepo structure is correct
- Check build logs in Railway dashboard - should see:
  1. Building rules package
  2. Building server
  3. Both successful
- If only seeing server build, Railway is deploying from wrong directory

### Server Won't Start
- Verify `SUPABASE_JWT_SECRET` is set correctly
- Check that `dist/index.js` exists after build
- Review server logs in Railway dashboard
- Ensure rules package was built successfully

### WebSocket Connection Issues
- Ensure Railway domain supports WebSocket (it does by default)
- Check that the frontend uses `wss://` (secure WebSocket) for production
- Verify the WebSocket path is `/ws`
- **If getting "INVALID_MESSAGE" errors with only HELLO/PING/READY:**
  - Backend was deployed from wrong directory
  - Rules package wasn't built
  - Server code is outdated
  - **Solution**: Redeploy from `poker_backend` root directory

## Updating Frontend

After deployment, update your frontend `.env` file:
```
VITE_GAME_SERVER_WS_URL=wss://your-app-name.up.railway.app/ws
```

## Custom Domain (Optional)

1. Go to Settings → Networking
2. Add custom domain
3. Railway will provide SSL certificate automatically
