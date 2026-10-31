const BRIDGE_BASE = 'http://127.0.0.1:31363';
const BRIDGE_ENDPOINT = `${BRIDGE_BASE}/gallery-id`;
const BRIDGE_PING = `${BRIDGE_BASE}/ping`;
const BRIDGE_RUN_COMMAND = `${BRIDGE_BASE}/run-command`;

const DEFAULT_SETTINGS = {
  enableGalleryBridge: true,
  enableNotifications: true,
  copyGalleryIdOnClick: false,
  copyGalleryIdViaExtension: false,
  suppressGalleryCopyToast: false,
  downloadButtonRunsCommand: false,
};

async function ensureDefaultSettings() {
  const current = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const updates = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof current[key] === 'undefined') {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
}

async function showNotification(title, message, tabId) {
  const { enableNotifications } = await chrome.storage.local.get(DEFAULT_SETTINGS);
  if (enableNotifications) {
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
    });
    return;
  }

  const targetTabId = tabId || (await getActiveTab().then((tab) => tab.id).catch(() => null));
  if (targetTabId) {
    chrome.tabs.sendMessage(targetTabId, { type: 'toast', title, message });
  }
}

function getActiveTab() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (!tabs.length) {
      throw new Error('No active tab detected.');
    }
    return tabs[0];
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultSettings();
});

if (chrome.runtime.onStartup && typeof chrome.runtime.onStartup.addListener === 'function') {
  chrome.runtime.onStartup.addListener(() => {
    ensureDefaultSettings();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'bridge-status') {
    (async () => {
      try {
        const response = await fetch(BRIDGE_PING, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        sendResponse({ ok: true, message: data.status || 'Bridge reachable' });
      } catch (error) {
        sendResponse({ ok: false, message: error?.message || 'Bridge offline' });
      }
    })();
    return true;
  }

  if (message?.type === 'notify') {
    (async () => {
      let tabId = message.tabId;
      if (!tabId && message.requestActiveTab) {
        try {
          const tab = await getActiveTab();
          tabId = tab.id;
        } catch (e) {
          tabId = null;
        }
      }
      await showNotification(message.title || 'doujinshi-dl Helper', message.message || '', tabId);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === 'run-download-command') {
    (async () => {
      try {
        const { enableGalleryBridge } = await chrome.storage.local.get(DEFAULT_SETTINGS);
        if (!enableGalleryBridge) {
          sendResponse({ ok: false, message: 'Gallery bridge disabled.' });
          return;
        }

        const response = await fetch(BRIDGE_RUN_COMMAND, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clearIds: Boolean(message?.clearIds) }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to trigger command.');
          throw new Error(errorText || `HTTP ${response.status}`);
        }

        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, message: error?.message || 'Unable to trigger command.' });
      }
    })();
    return true;
  }

  if (message?.type === 'gallery-id') {
    (async () => {
      try {
        const { enableGalleryBridge } = await chrome.storage.local.get(DEFAULT_SETTINGS);
        if (!enableGalleryBridge) {
          sendResponse({ ok: false, message: 'Gallery bridge disabled.' });
          return;
        }

        const payload = {
          galleryId: message.galleryId,
          clearBeforeInsert: Boolean(message.clearBeforeInsert),
        };

        await fetch(BRIDGE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const action = payload.clearBeforeInsert ? 'Cleared and inserted' : 'Inserted';
        const tabId = sender?.tab?.id;
        showNotification('Gallery ID sent', `${action} #${payload.galleryId}`, tabId);
        sendResponse({ ok: true });
      } catch (error) {
        console.error('Failed to forward gallery ID to desktop app:', error);
        const tabId = sender?.tab?.id;
        showNotification('Gallery ID failed', error?.message || 'Unable to reach desktop app.', tabId);
        sendResponse({ ok: false, message: error?.message || 'Unknown error' });
      }
    })();

    return true;
  }

  return false;
});
