# Build Fix Summary

## Problem
Railway deployment was failing with:
```
Error: Cannot find module '/app/apps/server/dist/index.js'
```

## Root Cause
1. **tsconfig.json** had `rootDir: "../.."` which caused TypeScript to output files in wrong structure
2. **Import path** was using `src/index.js` instead of `dist/index.js` for rules package

## Fixes Applied

### 1. Fixed tsconfig.json
**Before:**
```json
{
  "rootDir": "../..",
  "outDir": "./dist"
}
```

**After:**
```json
{
  "rootDir": "./src",
  "outDir": "./dist"
}
```

This ensures TypeScript outputs directly to `apps/server/dist/index.js` instead of a nested structure.

### 2. Fixed Import Path
**Before:**
```typescript
} from '../../../packages/rules/src/index.js';
```

**After:**
```typescript
} from '../../../packages/rules/dist/index.js';
```

This imports from the built version of the rules package, not the source.

## Build Process

The build now works correctly:

1. **Build rules package:**
   ```bash
   cd packages/rules && npm install && npm run build
   ```
   Outputs to: `packages/rules/dist/index.js`

2. **Build server:**
   ```bash
   cd apps/server && npm install && npm run build
   ```
   Outputs to: `apps/server/dist/index.js`

3. **Start server:**
   ```bash
   cd apps/server && npm start
   ```
   Runs: `node dist/index.js` (finds `apps/server/dist/index.js`)

## Verification

After deployment, verify:
1. Build logs show successful compilation
2. Server starts without "MODULE_NOT_FOUND" errors
3. `/health` endpoint works
4. `/version` endpoint works (after code is deployed)
