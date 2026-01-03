// Background Service Worker for Reading List Sync
// Runs automatically once per day when browser opens

const STORAGE_KEY = 'lastSyncDate';
// Save to the reading_list folder - Chrome downloads go to user's Downloads folder
// The filename includes the date for easy identification
const OUTPUT_FOLDER = 'reading_list_exports';

// Check if we should sync today
async function shouldSyncToday() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const lastSyncDate = result[STORAGE_KEY];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`[Reading List Sync] Last sync: ${lastSyncDate}, Today: ${today}`);

    return lastSyncDate !== today;
}

// Mark today as synced
async function markSyncComplete() {
    const today = new Date().toISOString().split('T')[0];
    await chrome.storage.local.set({ [STORAGE_KEY]: today });
    console.log(`[Reading List Sync] Marked sync complete for ${today}`);
}

// Get all reading list items
async function getReadingListItems() {
    try {
        if (!chrome.readingList) {
            console.error('[Reading List Sync] Reading List API not available');
            return null;
        }

        const items = await chrome.readingList.query({});
        console.log(`[Reading List Sync] Found ${items.length} items`);
        return items;
    } catch (error) {
        console.error('[Reading List Sync] Error getting reading list:', error);
        return null;
    }
}

// Save to JSON file via downloads API (silent, no prompt)
async function saveToFile(items, isAutoSync = true) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const exportData = {
        exported_at: new Date().toISOString(),
        source: 'Chrome Reading List Extension',
        auto_sync: isAutoSync,
        count: items.length,
        items: items.map(item => ({
            title: item.title,
            url: item.url,
            hasBeenRead: item.hasBeenRead,
            creationTime: item.creationTime,
            lastUpdateTime: item.lastUpdateTime
        }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    // Service workers don't have URL.createObjectURL, use data URL instead
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
    const dataUrl = `data:application/json;base64,${base64Data}`;

    // Filename includes date for daily tracking
    // This will save to: ~/Downloads/reading_list_exports/reading_list_YYYY-MM-DD.json
    const filename = `${OUTPUT_FOLDER}/reading_list_${today}.json`;

    try {
        const downloadId = await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            conflictAction: 'overwrite', // Overwrite if already synced today
            saveAs: false // Silent download, no prompt
        });

        console.log(`[Reading List Sync] Saved to ${filename} (download ID: ${downloadId})`);
        return { success: true, filename, downloadId };
    } catch (error) {
        console.error('[Reading List Sync] Error saving file:', error);
        return { success: false, error: error.message };
    }
}

// Main sync function
async function performSync(forceSync = false) {
    console.log('[Reading List Sync] Starting sync...');

    // Check if we already synced today (skip check if force sync)
    if (!forceSync && !await shouldSyncToday()) {
        console.log('[Reading List Sync] Already synced today, skipping');
        return { status: 'skipped', reason: 'already_synced_today' };
    }

    // Get reading list items
    const items = await getReadingListItems();
    if (!items) {
        return { status: 'error', reason: 'failed_to_get_items' };
    }

    if (items.length === 0) {
        console.log('[Reading List Sync] No items to sync');
        await markSyncComplete();
        return { status: 'success', count: 0, message: 'No items in reading list' };
    }

    // Save to file
    const saveResult = await saveToFile(items, !forceSync);

    if (saveResult.success) {
        if (!forceSync) {
            await markSyncComplete();
        }
        return {
            status: 'success',
            count: items.length,
            filename: saveResult.filename
        };
    }

    return { status: 'error', reason: saveResult.error };
}

// Run on browser startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('[Reading List Sync] Browser started');

    // Small delay to ensure Chrome is fully initialized
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await performSync();
    console.log('[Reading List Sync] Startup sync result:', result);
});

// Run on extension installation/update
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Reading List Sync] Extension installed/updated:', details.reason);

    // Small delay to ensure Chrome is fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await performSync();
    console.log('[Reading List Sync] Install sync result:', result);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'manual_sync') {
        // Force sync regardless of date
        (async () => {
            const result = await performSync(true); // Force sync
            sendResponse(result);
        })();
        return true; // Keep message channel open for async response
    }

    if (message.action === 'get_status') {
        (async () => {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            const items = await getReadingListItems();
            const shouldSync = await shouldSyncToday();
            sendResponse({
                lastSyncDate: result[STORAGE_KEY] || 'Never',
                itemCount: items ? items.length : 0,
                shouldSyncToday: shouldSync
            });
        })();
        return true;
    }

    if (message.action === 'reset_sync') {
        chrome.storage.local.remove(STORAGE_KEY);
        sendResponse({ status: 'reset' });
    }

    if (message.action === 'get_items') {
        (async () => {
            const items = await getReadingListItems();
            sendResponse({ items: items || [] });
        })();
        return true;
    }
});

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = { performSync, getReadingListItems };
}
