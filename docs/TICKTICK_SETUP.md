# TickTick Integration Setup Guide

This guide explains how to set up the TickTick API integration for the Tasks page in inkdash.

## Overview

The Tasks page uses the TickTick Open API to display your tasks in a clean, read-only interface with three filtering options:

- **Today**: Tasks due today or overdue
- **This Week**: Tasks due within the next 7 days
- **Backlog**: Tasks without a due date

Tasks are automatically refreshed every 5 minutes.

## Prerequisites

You need a TickTick account and access to the TickTick Open API.

## Step 1: Create a TickTick OAuth Application

1. Go to [TickTick Developer Console](https://developer.ticktick.com/)
2. Sign in with your TickTick account
3. Create a new OAuth application:
   - Click "Create Application"
   - Fill in the application details:
     - **Name**: inkdash (or any name you prefer)
     - **Redirect URI**: `http://localhost:5173` (for development)
   - Save the application

4. Note down your credentials:
   - **Client ID**: Found in your application settings
   - **Client Secret**: Found in your application settings

## Step 2: Get an Access Token

TickTick uses OAuth 2.0 for authentication. You need to obtain an access token:

### Using the Authorization Code Flow

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

## Step 3: Configure inkdash

Add your TickTick credentials to the config file:

**Config file location:**
- **macOS**: `~/Library/Application Support/inkdash/config.toml`
- **Linux**: `~/.config/inkdash/config.toml`

Add the following section to your config:

```toml
[ticktick]
access_token = "your_access_token_here"
```

See [`config/config.example.toml`](../config/config.example.toml) for a complete example.

## Step 4: Start the Application

```bash
bun tauri:dev
```

Navigate to the Tasks page and you should see your TickTick tasks loaded.

## Token Refresh

Access tokens typically expire after a certain period. When your token expires:

1. Repeat Step 2 to get a new access token
2. Update the `access_token` in your config file
3. Restart the application

## Troubleshooting

### "TickTick not configured" Error

- Make sure your config file exists and contains the `[ticktick]` section with `access_token`
- Restart the application after modifying the config file

### "Failed to fetch TickTick tasks" Error

- Check that your access token is valid and not expired
- Verify that your token has the correct API scopes (`tasks:read` at minimum)
- Check the Tauri console for detailed error messages

### No Tasks Displayed

- Verify that you have active (non-completed) tasks in your TickTick account
- Check the different filter tabs (Today, This Week, Backlog)
- Ensure your tasks have due dates set for Today/This Week filters

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

## API Reference

The integration uses the following TickTick API endpoints:

- `GET /open/v1/task` - Fetch all tasks
- `GET /open/v1/project` - Fetch all projects/lists

For full API documentation, visit: https://developer.ticktick.com/api

## Security Notes

- Your access token grants access to your TickTick data - keep it secure
- Never share your config file with others
- The config file is stored locally and never transmitted
- Access tokens should be rotated regularly for security
