// All field IDs that map to storage keys
const FIELD_IDS = [
  "gender",
  "race",
  "veteran",
  "disability",
  "authorization",
  "sponsorship",
  "salary",
  "referral",
];

// Load saved settings into the form on popup open
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(FIELD_IDS, (data) => {
    for (const id of FIELD_IDS) {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) {
        el.value = data[id];
      }
    }
  });
});

// Save settings
document.getElementById("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {};
  for (const id of FIELD_IDS) {
    data[id] = document.getElementById(id).value;
  }
  chrome.storage.local.set(data, () => {
    showToast("Settings saved!");
  });
});

// Fill current page button — sends message to content script via background
document.getElementById("fill-btn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    // Inject content script if not already present, then send fill message
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["content/content.js"],
      },
      () => {
        // Ignore errors if script already injected
        chrome.runtime.lastError;

        chrome.tabs.sendMessage(tabs[0].id, { action: "fill" }, (response) => {
          if (chrome.runtime.lastError) {
            showToast("Could not reach page. Try refreshing.");
            return;
          }
          if (response && response.filled > 0) {
            showToast(`Filled ${response.filled} field(s)!`);
          } else {
            showToast("No matching fields found.");
          }
        });
      }
    );
  });
});

// Toast notification helper
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2000);
}
