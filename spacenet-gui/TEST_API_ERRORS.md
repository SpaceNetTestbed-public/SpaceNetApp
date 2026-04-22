# Testing Real API Error Messages

## Quick Test Steps

### 1. Test with Backend Offline
1. Make sure backend is **stopped** (or change `.env` to wrong URL like `http://localhost:9999`)
2. Start frontend: `pnpm dev`
3. Open browser DevTools (F12) → **Network** tab
4. Try these actions and check the toast messages:

   **Login Page** (`/login`)
   - Try to log in → Should show connection/network error (not generic "Failed to log in")

   **Experiments Page** (`/experiments`)
   - Page loads → Should show error about loading experiments
   - Try to create experiment → Should show error

   **Jobs Page** (`/jobs`)
   - Page loads → Should show error about loading queue
   - Try to cancel a job → Should show error

   **Ground Stations Page** (`/ground-stations`)
   - Page loads → Should show error about loading files
   - Try to delete a file → Should show error

### 2. Test with Backend Online (Real Errors)
1. Start backend on `http://localhost:5000`
2. Start frontend: `pnpm dev`
3. Try actions that trigger real API errors:

   **Login** (`/login`)
   - Wrong username/password → Should show backend's error message (e.g., "Invalid credentials")

   **Create Account** (`/create-account`)
   - Duplicate email → Should show backend's error (e.g., "Email already exists")

   **Experiments** (`/experiments`)
   - Delete experiment → If it fails, should show backend's error message

### 3. Check Network Tab
- Open DevTools → Network tab
- Look for failed requests (red status)
- Click on a failed request → **Response** tab
- Check if the response body has `detail`, `message`, or `error` fields
- The toast should show that message instead of generic text

### 4. Expected Behavior
✅ **Good**: Toast shows specific error like "Connection refused" or "Invalid credentials"  
❌ **Bad**: Toast shows generic "Failed to load experiments" or "Request failed"

## What to Look For

The `getApiErrorMessage` function:
- Parses JSON responses for `detail`, `message`, or `error` fields
- Falls back to the error message text if not JSON
- Falls back to your provided fallback if message is empty

So you should see **specific error messages** from the backend instead of generic ones!
