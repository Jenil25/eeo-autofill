// Background service worker — relays messages between popup and content scripts.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fill") {
    // Forward fill request to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: "No active tab" });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        sendResponse(response || { error: "No response from content script" });
      });
    });
    return true; // Keep message channel open for async response
  }
});

// When the extension icon is clicked and popup is not configured,
// this provides a fallback to trigger fill directly
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "fill" });
});
