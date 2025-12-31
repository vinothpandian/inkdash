# Google Calendar API Setup Guide

This guide explains how to set up the Google Calendar API integration for the inkdash dashboard.

## Features

- **Week View**: Full 7-day week view with hourly time slots
- **Multi-Day Views**: 3-day or 5-day views for focused planning
- **Navigation**: Previous/Next week/period navigation with "Today" button
- **Multiple Calendars**: Display multiple calendars with color coding and filtering
- **Calendar Filters**: Toggle individual calendars on/off
- **Color Coding**: Each calendar gets a unique color for easy identification
- **Read-Only**: View your calendar events without modification
- **Click Events**: Click on events to open them in Google Calendar

## Prerequisites

1. A Google account with Google Calendar
2. Access to Google Cloud Console

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and click **Enable**

### 3. Create API Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the generated API key
4. (Optional) Click **Restrict Key** to limit usage:
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain (e.g., `localhost:5173/*` for development)
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Calendar API"
5. Click **Save**

### 4. Configure Your Application

1. Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:

```env
# Your API key from step 3
VITE_GOOGLE_CALENDAR_API_KEY=AIza...your_api_key_here

# Your Google Calendar ID (usually your email)
# For your primary calendar, use your Gmail address
VITE_GOOGLE_CALENDAR_ID=your-email@gmail.com
```

### 5. Find Your Calendar ID

To use a specific calendar:

1. Open [Google Calendar](https://calendar.google.com/)
2. Click the three dots next to the calendar you want to use
3. Select **Settings and sharing**
4. Scroll down to **Integrate calendar**
5. Copy the **Calendar ID** (looks like `abc123@group.calendar.google.com`)
6. Use this as your `VITE_GOOGLE_CALENDAR_ID`

### 6. Make Calendar Public (Required for API Key Access)

For the API key to work, your calendar must be publicly accessible:

1. In Google Calendar settings for your calendar
2. Go to **Access permissions for events**
3. Check **Make available to public**
4. (Optional) You can still keep event details private

**Alternative**: Use OAuth 2.0 instead of API key for private calendars (more complex setup).

## Multiple Calendars Setup (Optional)

You can display multiple calendars with color coding and individual filtering.

### Configuration Format

Add a `VITE_GOOGLE_CALENDARS` environment variable using this format:

```env
VITE_GOOGLE_CALENDARS=id1:name1:color1,id2:name2:color2,id3:name3:color3
```

**Available Colors**: `blue`, `purple`, `green`, `red`, `orange`, `pink`, `cyan`, `amber`

### Example

```env
VITE_GOOGLE_CALENDAR_API_KEY=AIza...your_api_key_here
VITE_GOOGLE_CALENDARS=personal@gmail.com:Personal:blue,work@company.com:Work:purple,family@group.calendar.google.com:Family:green
```

### Steps

1. **Find Calendar IDs**: Repeat step 5 above for each calendar you want to add
2. **Make All Calendars Public**: Each calendar must be publicly accessible (step 6)
3. **Configure Format**: Add each calendar with format `id:displayName:color`
4. **Separate with Commas**: Use commas (no spaces) to separate multiple calendars

### Features

When using multiple calendars:

- **Color-Coded Events**: Each calendar's events appear in its assigned color
- **Filter Button**: A "Calendars" button appears in the header
- **Toggle Visibility**: Click checkboxes to show/hide specific calendars
- **Quick Actions**: "Select All" and "Clear All" buttons for convenience
- **Legend**: Filter dropdown shows each calendar with its color indicator

### Note on Single vs Multiple

- If `VITE_GOOGLE_CALENDARS` is set, it **overrides** `VITE_GOOGLE_CALENDAR_ID`
- For single calendar setup, use only `VITE_GOOGLE_CALENDAR_ID` (simpler)
- For multiple calendars, use `VITE_GOOGLE_CALENDARS` (more features)

## Usage

Once configured, the calendar page will automatically:

- Load events from your Google Calendar
- Display them in the selected view (week, 3-day, or 5-day)
- Allow navigation between time periods
- Show loading states and error messages

## View Options

### Week View
- Shows full 7-day week (Sunday to Saturday)
- Hourly time slots from 12 AM to 11 PM
- All-day events shown at the top

### 3-Day View
- Shows 3 consecutive days starting from the selected date
- Same hourly layout as week view
- Better for detailed planning

### 5-Day View
- Shows 5 consecutive days (workweek-style)
- Same hourly layout as week view
- Good for work schedules

## Troubleshooting

### "API key not configured" Error
- Check that `.env` file exists in project root
- Verify `VITE_GOOGLE_CALENDAR_API_KEY` is set correctly
- Restart the development server after adding environment variables

### "Failed to fetch calendar events" Error
- Verify the Calendar ID is correct
- Check that the calendar is made public (see step 6)
- Verify the Google Calendar API is enabled in your project
- Check API key restrictions (referrer, API access)

### No Events Showing
- Verify you have events in the selected date range
- Check browser console for errors
- Try accessing the calendar directly in Google Calendar

### 403 Error
- Calendar might not be public
- API key might be restricted
- Calendar ID might be incorrect

## Security Notes

- API keys are visible in client-side code - only use with public calendars
- For private calendars, implement OAuth 2.0 (not covered in this basic setup)
- Consider adding referrer restrictions to your API key
- Never commit `.env` file to version control

## Further Customization

### Changing Time Range
Edit `src/utils/calendar.ts` to adjust the hours displayed (currently 0-23).

### Styling Events
Edit `src/components/calendar/WeekView.tsx` or `MultiDayView.tsx` to customize event appearance.

### Adding More Views
Create new view components following the pattern in `WeekView.tsx` and add them to `CalendarView.tsx`.

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [OAuth 2.0 for Client-side Apps](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
