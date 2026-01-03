# Chrome Reading List Auto-Export Extension

An automated Chrome extension that exports your Reading List to JSON once per day using the official `chrome.readingList` API.

## ✨ Features

- 🔄 **Auto-export on browser startup** (once per day, first launch only)
- 📊 View Reading List statistics (total, read, unread)
- 💾 Saves to Downloads folder as dated JSON files
- 📥 Manual export to JSON with Save As dialog
- 📋 Copy to clipboard

## 🛠 Installation

### Step 1: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `chrome_reading_list_extension` folder

That's it! No additional setup required.

## 📁 How It Works

### Automatic Daily Export

1. **First Chrome launch of the day**: Extension automatically exports your Reading List
2. **File saved to**: `~/Downloads/reading_list_exports/reading_list_YYYY-MM-DD.json`
3. **Subsequent launches**: Skipped (already synced today)
4. **Next day**: Cycle repeats

### Manual Export

Click the extension icon to:
- **Export Now**: Immediately export to Downloads folder
- **Export JSON**: Export with Save As dialog to choose location
- **Copy to Clipboard**: Copy JSON data

## 📊 Output Format

```json
{
  "exported_at": "2026-01-03T12:53:39.519Z",
  "source": "Chrome Reading List Extension",
  "auto_sync": true,
  "count": 115,
  "items": [
    {
      "title": "How to Do Great Work",
      "url": "http://paulgraham.com/greatwork.html",
      "hasBeenRead": false,
      "creationTime": 1697456229073,
      "lastUpdateTime": 1697456229073
    }
  ]
}
```

## 🔧 Troubleshooting

### Extension not auto-syncing

1. Check the service worker logs:
   - Go to `chrome://extensions/`
   - Click "Service Worker" under the extension
   - View the console for logs

2. Check if already synced today:
   - Open the popup and check the sync status

### "Reading List API not available"

- Make sure you're using **Chrome 120 or later**
- The Reading List API is only available in recent Chrome versions

### Files not appearing in Downloads

1. Check Chrome's download settings (`chrome://settings/downloads`)
2. Look in `~/Downloads/reading_list_exports/` folder
3. Check for download errors in the extension's service worker console

## 📋 Requirements

- **Chrome 120+** (Reading List API requirement)
- **macOS, Windows, or Linux**

## 🔐 Security & Privacy

- ✅ The extension only accesses your Reading List
- ✅ Data is stored locally on your machine
- ✅ No external network requests are made
- ✅ No account or login required

## 🚀 Future Enhancements

To sync to a database (like the bookmarks system), you can:
1. Set up a file watcher on the exports folder
2. Use a cron job to process the latest JSON file
3. Import into Supabase/PostgreSQL using a Python script

See `get_reading_list.py` in the parent directory for database sync logic.
