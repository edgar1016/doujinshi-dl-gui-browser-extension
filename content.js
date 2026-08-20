(function () {
  const showToast = (title, message) => {
    let container = document.getElementById('doujinshi-dl-helper-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'doujinshi-dl-helper-toast-container';
      container.style.position = 'fixed';
      container.style.top = '64px';
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      container.style.zIndex = '99999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = 'linear-gradient(135deg, #111014, #1c1b24)';
    toast.style.color = '#fefefe';
    toast.style.padding = '10px 18px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.45)';
    toast.style.fontSize = '12px';
    toast.style.minWidth = '220px';
    toast.style.border = '1px solid rgba(237,37,83,0.4)';
    toast.style.backdropFilter = 'blur(6px)';
    toast.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    toast.style.transform = 'translateY(-8px)';

    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = '700';
    titleEl.style.color = '#ed2553';
    titleEl.textContent = title;
    const messageEl = document.createElement('div');
    messageEl.textContent = message;

    toast.appendChild(titleEl);
    toast.appendChild(messageEl);
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'toast') {
      showToast(message.title || 'doujinshi-dl Helper', message.message || '');
    }
  });

  const galleryHeading = document.querySelector('#gallery_id');
  if (!galleryHeading) {
    return;
  }

  const GALLERY_PREF_DEFAULTS = {
    enableGalleryBridge: true,
    copyGalleryIdOnClick: false,
    copyGalleryIdViaExtension: false,
    suppressGalleryCopyToast: false,
    downloadButtonRunsCommand: false,
  };

  let galleryBridgeEnabled = true;
  let copyGalleryIdOnClick = false;
  let copyGalleryIdViaExtension = false;
  let suppressGalleryCopyToast = false;
  let downloadButtonRunsCommand = false;
  let runButtonObserver = null;
  const RUN_BUTTON_ATTR = 'data-nh-helper-run-button';
  const RUN_BUTTON_SELECTOR = '[data-nh-helper-run-button="1"]';

  const updateGalleryHeadingTooltip = () => {
    if (!galleryBridgeEnabled) {
      galleryHeading.title = 'Default site behavior. Enable the gallery bridge to send IDs to the desktop app.';
      galleryHeading.style.cursor = '';
      return;
    }

    const baseHint = 'Left click to send gallery ID to doujinshi-dl-gui. Ctrl/Cmd + Left click clears before sending.';
    const copyHint = copyGalleryIdOnClick
      ? ' site clipboard + notification still active.'
      : ' site clipboard suppressed (toggle the setting to restore it).';
    const clipboardHint = copyGalleryIdViaExtension
      ? ' Extension will copy #ID for you.'
      : '';
    galleryHeading.title = `${baseHint}${copyHint}${clipboardHint}`.trim();
    galleryHeading.style.cursor = 'pointer';
  };

  const shouldShowRunButton = () => galleryBridgeEnabled && downloadButtonRunsCommand;

  const isDownloadButtonCandidate = (element) => {
    if (!element || element.hasAttribute(RUN_BUTTON_ATTR)) {
      return false;
    }
    const text = (element.textContent || '').trim().toLowerCase();
    if (!text || !text.includes('download') || text.includes('torrent')) {
      return false;
    }
    const href = (element.getAttribute('href') || '').toLowerCase();
    if (href.includes('torrent')) {
      return false;
    }
    return true;
  };

  const findDownloadButton = () => {
    const preferred = document.querySelector('#download-wrapper #download');
    if (preferred) {
      return preferred;
    }
    const selector = 'a.btn, button.btn, a.button, button.button';
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes.find((node) => isDownloadButtonCandidate(node)) || null;
  };

  const buildRunButton = (referenceButton) => {
    const runButton = document.createElement('button');
    runButton.type = 'button';
    runButton.className = referenceButton.className;
    runButton.setAttribute(RUN_BUTTON_ATTR, '1');
    runButton.setAttribute('title', 'Trigger the doujinshi-dl-gui run command.');
    runButton.style.marginLeft = '8px';
    runButton.innerHTML = '<i class="fa fa-play"></i> Run';
    return runButton;
  };

  const insertRunButton = () => {
    if (document.querySelector(RUN_BUTTON_SELECTOR)) {
      return;
    }
    const downloadButton = findDownloadButton();
    if (!downloadButton) {
      return;
    }
    const runButton = buildRunButton(downloadButton);
    const wrapper = downloadButton.closest('#download-wrapper') || downloadButton;
    wrapper.insertAdjacentElement('afterend', runButton);
  };

  const removeRunButton = () => {
    document.querySelectorAll(RUN_BUTTON_SELECTOR).forEach((button) => button.remove());
  };

  function ensureRunButtonObserver(active) {
    if (!document.body) {
      return;
    }
    if (active && !runButtonObserver) {
      runButtonObserver = new MutationObserver(() => {
        applyRunButtonState();
      });
      runButtonObserver.observe(document.body, { childList: true, subtree: true });
    } else if (!active && runButtonObserver) {
      runButtonObserver.disconnect();
      runButtonObserver = null;
    }
  }

  function applyRunButtonState() {
    const shouldShow = shouldShowRunButton();
    if (runButtonObserver) {
      runButtonObserver.disconnect();
      runButtonObserver = null;
    }
    if (shouldShow) {
      insertRunButton();
    } else {
      removeRunButton();
    }
    ensureRunButtonObserver(shouldShow);
  }

  const refreshBridgeState = () => {
    chrome.storage.local.get(GALLERY_PREF_DEFAULTS, (items) => {
      galleryBridgeEnabled = items.enableGalleryBridge;
      copyGalleryIdOnClick = items.copyGalleryIdOnClick;
      copyGalleryIdViaExtension = items.copyGalleryIdViaExtension;
      suppressGalleryCopyToast = items.suppressGalleryCopyToast;
      downloadButtonRunsCommand = items.downloadButtonRunsCommand;
      updateGalleryHeadingTooltip();
      applyRunButtonState();
    });
  };

  refreshBridgeState();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
      return;
    }
    let shouldUpdateTooltip = false;
    let shouldRefreshRunButton = false;
    if (changes.enableGalleryBridge) {
      galleryBridgeEnabled = changes.enableGalleryBridge.newValue;
      shouldUpdateTooltip = true;
      shouldRefreshRunButton = true;
    }
    if (changes.copyGalleryIdOnClick) {
      copyGalleryIdOnClick = changes.copyGalleryIdOnClick.newValue;
      shouldUpdateTooltip = true;
    }
    if (changes.copyGalleryIdViaExtension) {
      copyGalleryIdViaExtension = changes.copyGalleryIdViaExtension.newValue;
      shouldUpdateTooltip = true;
    }
    if (changes.suppressGalleryCopyToast) {
      suppressGalleryCopyToast = changes.suppressGalleryCopyToast.newValue;
    }
    if (changes.downloadButtonRunsCommand) {
      downloadButtonRunsCommand = changes.downloadButtonRunsCommand.newValue;
      shouldRefreshRunButton = true;
    }
    if (shouldUpdateTooltip) {
      updateGalleryHeadingTooltip();
    }
    if (shouldRefreshRunButton) {
      applyRunButtonState();
    }
  });

  updateGalleryHeadingTooltip();
  applyRunButtonState();

  const extractGalleryId = () => {
    const text = galleryHeading.textContent || '';
    const match = text.match(/(\d{1,7})/);
    return match ? match[1] : null;
  };

  const copyGalleryIdContents = async (galleryIdText) => {
    try {
      await navigator.clipboard.writeText(galleryIdText);
      if (!suppressGalleryCopyToast) {
        showToast('Gallery ID copied', `${galleryIdText} is now in your clipboard.`);
      }
    } catch (error) {
      console.warn('doujinshi-dl Helper: Failed to copy gallery ID.', error);
    }
  };

  const triggerRunCommand = (clearIds = false) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'run-download-command',
          clearIds: Boolean(clearIds),
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response?.ok) {
            reject(new Error(response?.message || 'Unable to trigger command.'));
            return;
          }
          resolve();
        }
      );
    });
  };

  const sendGalleryId = (galleryId, clearBeforeInsert) => {
    if (!galleryBridgeEnabled) {
      return;
    }

    const resolvedId = galleryId || extractGalleryId();
    if (!resolvedId) {
      console.warn('doujinshi-dl Bridge: Unable to find gallery ID.');
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: 'gallery-id',
        galleryId: resolvedId,
        clearBeforeInsert,
      },
      (response) => {
        if (!response?.ok) {
          console.warn('doujinshi-dl Bridge: desktop app not reachable.', response?.message);
        }
      }
    );
  };

  document.addEventListener('click', (event) => {
    if (event.button !== 0) {
      return;
    }

    const runButtonTarget = shouldShowRunButton()
      ? event.target?.closest?.(RUN_BUTTON_SELECTOR)
      : null;

    if (runButtonTarget) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      triggerRunCommand(false)
        .then(() => {
          showToast('Run command triggered', 'Check doujinshi-dl-gui for progress.');
        })
        .catch((error) => {
          showToast('Run command failed', error?.message || 'Desktop GUI unreachable.');
        });
      return;
    }

    const headingTarget = event.target?.closest?.('#gallery_id');
    if (!headingTarget) {
      return;
    }

    if (!galleryBridgeEnabled) {
      return;
    }

    const galleryId = extractGalleryId();
    if (!galleryId) {
      return;
    }

    if (!copyGalleryIdOnClick) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const clearBefore = event.ctrlKey || event.metaKey;
    sendGalleryId(galleryId, clearBefore);

    if (copyGalleryIdViaExtension) {
      copyGalleryIdContents(`#${galleryId}`);
    }
  }, { capture: true });
})();

