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

3. **Configure Build Settings** (Optional - Railway will auto-detect)
   - Go to Settings → Build
   - Build Command: `npm run build` (from root, uses root package.json)
   - Start Command: `npm start` (from root, uses root package.json)
   - Root Directory: Leave empty (deploy from `poker_backend` root)
   - **Note**: Railway will use the `railway.json` or root `package.json` scripts automatically

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

Railway will automatically:
1. Install dependencies for both packages
2. Build rules package first
3. Build server TypeScript: `npm run build`
4. Start server: `npm start`

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
- Check that `tsconfig.json` is correct
- Ensure all dependencies are in `package.json`
- Verify the monorepo structure is correct
- Check build logs in Railway dashboard

### Server Won't Start
- Verify `SUPABASE_JWT_SECRET` is set correctly
- Check that `dist/index.js` exists after build
- Review server logs in Railway dashboard
- Ensure rules package was built successfully

### WebSocket Connection Issues
- Ensure Railway domain supports WebSocket (it does by default)
- Check that the frontend uses `wss://` (secure WebSocket) for production
- Verify the WebSocket path is `/ws`

## Updating Frontend

After deployment, update your frontend `.env` file:
```
VITE_GAME_SERVER_WS_URL=wss://your-app-name.up.railway.app/ws
```

## Custom Domain (Optional)

1. Go to Settings → Networking
2. Add custom domain
3. Railway will provide SSL certificate automatically
