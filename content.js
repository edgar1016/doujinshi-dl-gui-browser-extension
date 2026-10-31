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
      container.style.pointerEvents = 'none';
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

  const AUTHOR_SELECTOR = 'h1.title .before';
  const TITLE_SELECTOR = 'h1.title .pretty, h2.title .pretty';
  const COPY_HIGHLIGHT_NAME = 'doujinshi-dl-helper-copy';

  let titleCopyEnabled = true;
  let hoveredCopyTarget = null;

  // Matches "[Circle (Author)]" and "[Author]", skipping prefixes such as "(C99) ".
  const findAuthorSpan = (text) => {
    const group = text.match(/\[([^\]]+)\]/);
    if (!group) {
      return null;
    }
    const nested = group[1].match(/\(([^()]+)\)\s*$/);
    const raw = nested ? nested[1] : group[1];
    const name = raw.trim();
    if (!name) {
      return null;
    }
    const rawStart = group.index + 1 + (nested ? nested.index + 1 : 0);
    const start = rawStart + raw.indexOf(name);
    return { name, start, end: start + name.length };
  };

  // Translations are split by "|", or by one spaced dash when both sides are long enough not to be a subtitle.
  const getTitleSeparator = (text) => {
    if (/[|｜]/.test(text)) {
      return /([|｜])/;
    }
    const dashSeparator = /(\s[-–—]\s)/;
    const parts = text.split(dashSeparator).filter((_, index) => index % 2 === 0);
    const isDualTitle = parts.length === 2 && parts.every((part) => part.trim().split(/\s+/).length >= 3);
    return isDualTitle ? dashSeparator : undefined;
  };

  const findTitleSpans = (text) => {
    const spans = [];
    let offset = 0;
    // The capture group keeps separators at odd indexes so offsets stay accurate.
    text.split(getTitleSeparator(text)).forEach((piece, index) => {
      const name = piece.trim();
      if (index % 2 === 0 && name) {
        const start = offset + piece.indexOf(name);
        spans.push({ name, start, end: start + name.length });
      }
      offset += piece.length;
    });
    return spans;
  };

  const formatAuthorName = (name) => `[${name.charAt(0).toUpperCase()}${name.slice(1)}]`;

  const getTextNode = (element) => Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);

  const getPageAuthor = () => {
    const authorEl = document.querySelector(AUTHOR_SELECTOR);
    const textNode = authorEl ? getTextNode(authorEl) : null;
    const span = textNode ? findAuthorSpan(textNode.nodeValue) : null;
    return span ? formatAuthorName(span.name) : null;
  };

  // The title is owned by Svelte, so text is located with a Range instead of wrapping it in a new element.
  const getCopyTargetAtPoint = (target, x, y) => {
    const element = target?.closest?.(`${AUTHOR_SELECTOR}, ${TITLE_SELECTOR}`);
    const textNode = element ? getTextNode(element) : null;
    if (!textNode) {
      return null;
    }
    const isAuthor = element.matches(AUTHOR_SELECTOR);
    const spans = isAuthor
      ? [findAuthorSpan(textNode.nodeValue)].filter(Boolean)
      : findTitleSpans(textNode.nodeValue);
    for (const span of spans) {
      const range = document.createRange();
      range.setStart(textNode, span.start);
      range.setEnd(textNode, span.end);
      const isInside = Array.from(range.getClientRects()).some(
        (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      );
      if (isInside) {
        const text = isAuthor
          ? formatAuthorName(span.name)
          : [getPageAuthor(), span.name].filter(Boolean).join(' ');
        return { element, range, text, label: isAuthor ? 'Author copied' : 'Title copied' };
      }
    }
    return null;
  };

  const clearCopyHover = () => {
    if (!hoveredCopyTarget) {
      return;
    }
    hoveredCopyTarget.element.style.cursor = '';
    hoveredCopyTarget.element.removeAttribute('title');
    hoveredCopyTarget = null;
    window.CSS?.highlights?.delete(COPY_HIGHLIGHT_NAME);
  };

  const ensureCopyHighlightStyle = () => {
    if (document.getElementById(COPY_HIGHLIGHT_NAME)) {
      return;
    }
    const style = document.createElement('style');
    style.id = COPY_HIGHLIGHT_NAME;
    style.textContent = `::highlight(${COPY_HIGHLIGHT_NAME}) { color: #ed2553; text-decoration: underline; }`;
    document.head.appendChild(style);
  };

  const applyCopyHover = (copyTarget) => {
    if (hoveredCopyTarget?.element === copyTarget.element && hoveredCopyTarget.text === copyTarget.text) {
      return;
    }
    clearCopyHover();
    hoveredCopyTarget = copyTarget;
    copyTarget.element.style.cursor = 'pointer';
    copyTarget.element.title = `Click to copy ${copyTarget.text}`;
    if (window.CSS?.highlights) {
      ensureCopyHighlightStyle();
      CSS.highlights.set(COPY_HIGHLIGHT_NAME, new Highlight(copyTarget.range));
    }
  };

  document.addEventListener('mousemove', (event) => {
    const copyTarget = titleCopyEnabled ? getCopyTargetAtPoint(event.target, event.clientX, event.clientY) : null;
    if (copyTarget) {
      applyCopyHover(copyTarget);
    } else {
      clearCopyHover();
    }
  }, { passive: true });

  document.addEventListener('click', async (event) => {
    if (event.button !== 0 || !titleCopyEnabled || !window.getSelection().isCollapsed) {
      return;
    }
    const copyTarget = getCopyTargetAtPoint(event.target, event.clientX, event.clientY);
    if (!copyTarget) {
      return;
    }
    try {
      await navigator.clipboard.writeText(copyTarget.text);
      showToast(copyTarget.label, `${copyTarget.text} is now in your clipboard.`);
    } catch (error) {
      console.warn('doujinshi-dl Helper: Failed to copy title.', error);
    }
  }, { capture: true });

  chrome.storage.local.get({ enableTitleCopy: true }, (items) => {
    titleCopyEnabled = items.enableTitleCopy;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enableTitleCopy) {
      titleCopyEnabled = changes.enableTitleCopy.newValue;
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

