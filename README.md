# EEO AutoFill

A Chrome Extension that auto-fills common EEO (Equal Employment Opportunity) and demographic questions on job application forms with a single click.

Tired of re-entering the same gender, race, veteran status, and disability information on every job application? EEO AutoFill saves your responses once and fills them everywhere — across Workday, Greenhouse, Lever, iCIMS, and dozens of other ATS platforms.

## Screenshots

<!-- TODO: Add screenshots -->
| Popup Settings | Auto-Fill in Action |
|:-:|:-:|
| *Screenshot coming soon* | *Screenshot coming soon* |

## Features

- **One-click auto-fill** for EEO and demographic form fields
- **Smart field detection** using label text, `aria-label`, `name`/`id` attributes, placeholder text, fieldset legends, and nearby text nodes
- **Broad ATS support**: Workday, Greenhouse, Lever, iCIMS, Taleo, SmartRecruiters, Ashby, Jobvite, and more
- **Handles all input types**: `<select>`, radio buttons, checkboxes, text inputs, and custom dropdown widgets
- **Fuzzy keyword matching** — detects fields even when labels vary between platforms
- **Floating page button** — small, non-intrusive "Fill EEO" button on matched job pages
- **Visual feedback** — filled fields briefly highlight so you can verify them
- **100% local and private** — no data leaves your browser, ever

### Supported Fields

| Field | Example Keywords Detected |
|-------|--------------------------|
| Gender | gender, sex |
| Race / Ethnicity | race, ethnicity, racial |
| Veteran Status | veteran, military, protected veteran |
| Disability Status | disability, disabled, handicap |
| Work Authorization | authorized to work, work authorization, legally authorized |
| Sponsorship | visa sponsorship, require sponsorship |
| Salary Expectation | salary, compensation, desired pay |
| Referral Source | how did you hear, referral source |

## Installation

### Developer Mode (Unpacked)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `eeo-autofill` folder
5. The extension icon will appear in your toolbar — click it to configure your saved values

### Chrome Web Store

<!-- TODO: Add Chrome Web Store link once published -->
*Coming soon.*

## How It Works

1. **Configure once**: Open the extension popup and set your EEO responses (gender, race, veteran status, disability, work authorization, sponsorship, salary, referral source). These are saved locally via `chrome.storage.local`.

2. **Visit a job application**: When you navigate to a supported ATS page (or any page matching common career URL patterns), the content script activates and injects a small floating "Fill EEO" button.

3. **Auto-fill**: Click the floating button or the "Fill Current Page" button in the popup. The content script scans the page for form elements, extracts label context from multiple sources (explicit labels, aria attributes, field names/IDs, placeholders, fieldset legends, sibling elements), and fuzzy-matches against a keyword map for each EEO field category.

4. **Smart value matching**: For `<select>` dropdowns, the extension matches your saved value against option text using case-insensitive partial matching. For radio buttons, it matches against associated label text. For custom widget dropdowns (common in Workday/Greenhouse), it programmatically clicks to open the dropdown and selects the matching option.

## Privacy

**All data is stored locally via `chrome.storage.local`. No data is transmitted anywhere — not to any server, API, or third party. The extension makes zero network requests. Your demographic information never leaves your browser.**

Permissions used:
- `storage` — Save your EEO responses locally
- `activeTab` — Access the current tab to fill form fields
- `scripting` — Inject the content script when you click "Fill Current Page"

## Tech Stack

- **Manifest V3** Chrome Extension
- Vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies
- Chrome Storage API for local persistence
- Content scripts with DOM traversal for field detection

## Project Structure

```
eeo-autofill/
├── manifest.json          # Extension manifest (V3)
├── popup/
│   ├── popup.html         # Settings UI
│   ├── popup.css          # Styles
│   └── popup.js           # Save/load logic
├── content/
│   └── content.js         # Field detection & filling
├── background/
│   └── service-worker.js  # Message relay
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Contributing

Contributions are welcome! Some areas that could use help:

- Support for additional ATS platforms
- Better handling of React/Angular controlled components
- Localization for non-English job application forms
- Improved custom dropdown detection heuristics

## License

MIT
