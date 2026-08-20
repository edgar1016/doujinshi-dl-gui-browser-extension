# doujinshi-dl-gui Browser Extension

Companion browser extension for **[doujinshi-dl-gui](https://codeberg.org/Edgar1016/doujinshi-dl-gui)** — a desktop GUI for RicterZ's [doujinshi-dl](https://github.com/RicterZ/doujinshi-dl) command-line tool. This extension bridges `nhentai.net` gallery pages to the desktop app, letting you send gallery IDs and trigger downloads without ever leaving your browser.

## Features

- 🔗 **Gallery ID bridge** — left-click a gallery's ID to send it straight to doujinshi-dl-gui.
- ▶️ **Run button** — adds a dedicated button next to Download that triggers the GUI's Run command.
- 🔔 **Notifications** — choose between desktop notifications or lightweight in-page toasts.
- ⚙️ **Fully configurable** — toggle every feature from the popup or the options page.

## Requirements

- Brave, Chrome, or another Chromium-based browser.
- [doujinshi-dl-gui](https://codeberg.org/Edgar1016/doujinshi-dl-gui) running locally.

## Installation

1. Download or clone this repository.
2. Open your browser's extensions page (`brave://extensions` or `chrome://extensions`).
3. Enable **Developer Mode**.
4. Click **Load unpacked** and select this folder.

## Usage

### Gallery ID Bridge

- Left-clicking the gallery ID heading appends it to `ids_input`.
- Holding `Ctrl` (or `Cmd` on macOS) while left-clicking clears the input first, then inserts the ID.
- Requires the desktop GUI to be running so the local HTTP bridge can accept the POST.
- Prefer not to run the bridge? Toggle it off inside the GUI (`File → Options → Enable Extension Bridge`) and the extension will stop sending IDs.

If the GUI is not running (or the HTTP bridge is disabled), the extension logs a warning in DevTools and clicks do nothing. Disabling the bridge in the popup stops the content script from sending IDs until re-enabled. Successful appends (and any errors) display a notification for quick feedback.

### Run Button

Enable **Add Run button** in the popup (or options page) to insert a separate "Run" button next to the site's Download button. Clicking it triggers the GUI's Run command without affecting the original Download button.

### Popup & Options

Click the extension icon to view the bridge status and toggle features on the fly. The options page offers finer control over gallery-click behavior, such as keeping the site's own copy toast or silencing extension notifications.

## How It Works

The extension talks to a small local HTTP server built into doujinshi-dl-gui at `http://127.0.0.1:31363/gallery-id`. As long as the desktop app is open, gallery IDs (and Run commands) sent from the browser are picked up instantly — no manual copy-pasting required.

## Related Project

- **[doujinshi-dl-gui](https://codeberg.org/Edgar1016/doujinshi-dl-gui)** — the desktop GUI this extension pairs with.
- **[RicterZ/doujinshi-dl](https://github.com/RicterZ/doujinshi-dl)** — the underlying command-line tool.

## License

This project is licensed under the MIT License, consistent with doujinshi-dl-gui.
