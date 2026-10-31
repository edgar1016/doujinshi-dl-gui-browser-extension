const galleryToggle = document.getElementById('toggle-gallery');
const galleryCopyToggle = document.getElementById('toggle-gallery-copy');
const galleryClipboardToggle = document.getElementById('toggle-gallery-clipboard');
const galleryClipboardSilentToggle = document.getElementById('toggle-gallery-clipboard-silent');
const runCommandButtonToggle = document.getElementById('toggle-run-command-button');
const authorCopyToggle = document.getElementById('toggle-author-copy');
const notificationsToggle = document.getElementById('toggle-notifications');
const bridgeStatusEl = document.getElementById('bridge-status');

const DEFAULT_SETTINGS = {
  enableGalleryBridge: true,
  enableNotifications: true,
  copyGalleryIdOnClick: false,
  copyGalleryIdViaExtension: false,
  suppressGalleryCopyToast: false,
  downloadButtonRunsCommand: false,
  enableAuthorCopy: true,
};

function syncGalleryClipboardSubToggle(isParentEnabled) {
  galleryClipboardSilentToggle.disabled = !isParentEnabled;
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  galleryToggle.checked = settings.enableGalleryBridge;
  galleryCopyToggle.checked = settings.copyGalleryIdOnClick;
  galleryClipboardToggle.checked = settings.copyGalleryIdViaExtension;
  galleryClipboardSilentToggle.checked = settings.suppressGalleryCopyToast;
  runCommandButtonToggle.checked = settings.downloadButtonRunsCommand;
  authorCopyToggle.checked = settings.enableAuthorCopy;
  notificationsToggle.checked = settings.enableNotifications;
  syncGalleryClipboardSubToggle(settings.copyGalleryIdViaExtension);
}

galleryToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ enableGalleryBridge: galleryToggle.checked });
});

galleryCopyToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ copyGalleryIdOnClick: galleryCopyToggle.checked });
});

galleryClipboardToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ copyGalleryIdViaExtension: galleryClipboardToggle.checked });
  syncGalleryClipboardSubToggle(galleryClipboardToggle.checked);
});

galleryClipboardSilentToggle.addEventListener('change', async () => {
  if (galleryClipboardSilentToggle.disabled) {
    return;
  }
  await chrome.storage.local.set({ suppressGalleryCopyToast: galleryClipboardSilentToggle.checked });
});

runCommandButtonToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ downloadButtonRunsCommand: runCommandButtonToggle.checked });
});

authorCopyToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ enableAuthorCopy: authorCopyToggle.checked });
});

notificationsToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ enableNotifications: notificationsToggle.checked });
});

async function updateBridgeStatus() {
  bridgeStatusEl.textContent = 'Checking bridge…';
  bridgeStatusEl.classList.remove('ok', 'error');
  chrome.runtime.sendMessage({ type: 'bridge-status' }, (response) => {
    if (response?.ok) {
      bridgeStatusEl.textContent = response.message || 'Bridge reachable';
      bridgeStatusEl.classList.add('ok');
    } else {
      bridgeStatusEl.textContent = (response && response.message) || 'Bridge offline';
      bridgeStatusEl.classList.add('error');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  updateBridgeStatus();
});
