const copyToggle = document.getElementById('opt-gallery-copy');
const clipboardToggle = document.getElementById('opt-gallery-clipboard');
const clipboardSilentToggle = document.getElementById('opt-gallery-clipboard-silent');
const runButtonToggle = document.getElementById('opt-run-command-button');
const titleCopyToggle = document.getElementById('opt-title-copy');

const DEFAULT_SETTINGS = {
  copyGalleryIdOnClick: false,
  copyGalleryIdViaExtension: false,
  suppressGalleryCopyToast: false,
  downloadButtonRunsCommand: false,
  enableTitleCopy: true,
};

function syncClipboardSilentToggle(enabled) {
  clipboardSilentToggle.disabled = !enabled;
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  copyToggle.checked = settings.copyGalleryIdOnClick;
  clipboardToggle.checked = settings.copyGalleryIdViaExtension;
  clipboardSilentToggle.checked = settings.suppressGalleryCopyToast;
  runButtonToggle.checked = settings.downloadButtonRunsCommand;
  titleCopyToggle.checked = settings.enableTitleCopy;
  syncClipboardSilentToggle(settings.copyGalleryIdViaExtension);
}

copyToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ copyGalleryIdOnClick: copyToggle.checked });
});

clipboardToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ copyGalleryIdViaExtension: clipboardToggle.checked });
  syncClipboardSilentToggle(clipboardToggle.checked);
});

clipboardSilentToggle.addEventListener('change', async () => {
  if (clipboardSilentToggle.disabled) {
    return;
  }
  await chrome.storage.local.set({ suppressGalleryCopyToast: clipboardSilentToggle.checked });
});

runButtonToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ downloadButtonRunsCommand: runButtonToggle.checked });
});

titleCopyToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ enableTitleCopy: titleCopyToggle.checked });
});

loadSettings();
