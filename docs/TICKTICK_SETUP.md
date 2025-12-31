# TickTick Integration Setup Guide

This guide explains how to set up the TickTick API integration for the Tasks page in InkDash.

## Overview

The Tasks page now uses the TickTick Open API to display your tasks in a clean, read-only interface with three filtering options:

- **Today**: Tasks due today or overdue
- **This Week**: Tasks due within the next 7 days
- **Backlog**: Tasks without a due date

Tasks are automatically refreshed every 5 minutes and cached in localStorage for offline access.

## Prerequisites

You need a TickTick account and access to the TickTick Open API.

## Step 1: Create a TickTick OAuth Application

1. Go to [TickTick Developer Console](https://developer.ticktick.com/)
2. Sign in with your TickTick account
3. Create a new OAuth application:
   - Click "Create Application"
   - Fill in the application details:
     - **Name**: InkDash (or any name you prefer)
     - **Redirect URI**: `http://localhost:5173` (for development)
   - Save the application

4. Note down your credentials:
   - **Client ID**: Found in your application settings
   - **Client Secret**: Found in your application settings

## Step 2: Get an Access Token

TickTick uses OAuth 2.0 for authentication. You need to obtain an access token:

### Option A: Use the Authorization Code Flow (Recommended)

1. Construct the authorization URL:
   ```
   https://ticktick.com/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=tasks:read&redirect_uri=http://localhost:5173&response_type=code
   ```

2. Visit this URL in your browser and authorize the application

3. You'll be redirected to your redirect URI with a code parameter:
   ```
   http://localhost:5173?code=AUTHORIZATION_CODE
   ```

4. Exchange the authorization code for an access token using a POST request:
   ```bash
   curl -X POST https://ticktick.com/oauth/token \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=AUTHORIZATION_CODE" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=http://localhost:5173" \
     -d "scope=tasks:read"
   ```

5. The response will contain your access token:
   ```json
   {
     "access_token": "your_access_token_here",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "your_refresh_token_here"
   }
   ```

### Option B: Use Personal Access Token (If Available)

Some API providers offer personal access tokens in the developer console. Check your TickTick developer settings for this option.

## Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your TickTick credentials:
   ```env
   VITE_TICKTICK_CLIENT_ID=your_client_id_here
   VITE_TICKTICK_CLIENT_SECRET=your_client_secret_here
   VITE_TICKTICK_ACCESS_TOKEN=your_access_token_here
   ```

3. **Important**: Never commit your `.env` file to version control. It's already in `.gitignore`.

## Step 4: Start the Development Server

```bash
bun dev
```

Navigate to the Tasks page and you should see your TickTick tasks loaded.

## Token Refresh

Access tokens typically expire after a certain period (e.g., 1 hour). To handle this:

1. **Manual Refresh**: When your token expires, repeat Step 2 to get a new access token
2. **Automatic Refresh** (Future Enhancement): Implement token refresh using the refresh token

## Troubleshooting

### "TickTick credentials not configured" Error

- Make sure your `.env` file exists and contains all three required variables
- Restart the development server after creating or modifying the `.env` file

### "Failed to fetch TickTick tasks" Error

- Check that your access token is valid and not expired
- Verify that your Client ID and Client Secret are correct
- Ensure you have the correct API scopes (`tasks:read` at minimum)
- Check the browser console for detailed error messages

### No Tasks Displayed

- Verify that you have active (non-completed) tasks in your TickTick account
- Check the different filter tabs (Today, This Week, Backlog)
- Open the browser console to check for any JavaScript errors

### CORS Errors

- The TickTick API should support CORS for web applications
- If you encounter CORS issues, you may need to configure your OAuth application's allowed origins

## Features

### Task Display

Each task shows:
- **Priority indicator**: Color-coded dot (red=high, yellow=medium, blue=low, gray=none)
- **Task title**: The task name/description
- **Project name**: Which list/project the task belongs to
- **Due date**: Formatted as "Today", "Tomorrow", or specific date
- **Tags**: Task labels if any

### Filtering

- **Today**: Shows tasks due today and overdue tasks
- **This Week**: Shows tasks due within the next 7 days
- **Backlog**: Shows tasks without any due date

### Auto-refresh

- Tasks are automatically refreshed every 5 minutes
- Data is cached in localStorage for faster loading

## API Reference

The integration uses the following TickTick API endpoints:

- `GET /open/v1/task` - Fetch all tasks
- `GET /open/v1/project` - Fetch all projects/lists

For full API documentation, visit: https://developer.ticktick.com/api

## Security Notes

- Your access token grants access to your TickTick data - keep it secure
- Never commit `.env` files to version control
- Consider using environment-specific credentials for development vs production
- Access tokens should be rotated regularly for security

## Next Steps

Consider enhancing the integration with:

- Automatic token refresh using refresh tokens
- Support for completing tasks (would require `tasks:write` scope)
- Filtering by specific projects/lists
- Search functionality
- Task sorting options
- Support for recurring tasks
- Display of task notes/descriptions
