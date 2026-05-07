// ============================================================
// EEO AutoFill — Content Script
// Detects and fills EEO/demographic form fields on job pages.
// ============================================================

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__eeoAutofillInjected) return;
  window.__eeoAutofillInjected = true;

  // ----------------------------------------------------------
  // Keyword mappings: storage key -> keywords to match in labels
  // ----------------------------------------------------------
  const FIELD_KEYWORDS = {
    gender: ["gender", "sex"],
    race: ["race", "ethnicity", "racial", "ethnic background"],
    veteran: ["veteran", "military", "protected veteran"],
    disability: [
      "disability",
      "disabled",
      "handicap",
      "disability status",
    ],
    authorization: [
      "authorized to work",
      "work authorization",
      "legally authorized",
      "eligibility to work",
      "legally eligible",
      "right to work",
      "authorized to work in the u",
    ],
    sponsorship: [
      "sponsorship",
      "visa sponsorship",
      "require sponsorship",
      "immigration sponsorship",
      "need sponsorship",
      "sponsor now or in the future",
    ],
    salary: [
      "salary",
      "compensation",
      "desired pay",
      "expected salary",
      "pay expectation",
      "salary expectation",
      "desired salary",
      "annual compensation",
    ],
    referral: [
      "how did you hear",
      "where did you hear",
      "referral source",
      "how did you find",
      "how did you learn about",
      "source of application",
      "how did you discover",
    ],
  };

  // ----------------------------------------------------------
  // Label extraction: gather all text context around a form element
  // ----------------------------------------------------------
  function getFieldLabelText(el) {
    const parts = [];

    // 1. Explicit <label for="...">
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) parts.push(label.textContent);
    }

    // 2. Wrapping <label>
    const parentLabel = el.closest("label");
    if (parentLabel) parts.push(parentLabel.textContent);

    // 3. aria-label / aria-labelledby
    if (el.getAttribute("aria-label")) {
      parts.push(el.getAttribute("aria-label"));
    }
    if (el.getAttribute("aria-labelledby")) {
      const ids = el.getAttribute("aria-labelledby").split(/\s+/);
      for (const id of ids) {
        const ref = document.getElementById(id);
        if (ref) parts.push(ref.textContent);
      }
    }

    // 4. name, id, placeholder as fallback context
    if (el.name) parts.push(el.name.replace(/[_\-\[\]]/g, " "));
    if (el.id) parts.push(el.id.replace(/[_\-\[\]]/g, " "));
    if (el.placeholder) parts.push(el.placeholder);

    // 5. Fieldset legend
    const fieldset = el.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) parts.push(legend.textContent);
    }

    // 6. Previous sibling text / nearby labels
    const prevSib = el.previousElementSibling;
    if (prevSib && ["LABEL", "SPAN", "P", "DIV"].includes(prevSib.tagName)) {
      parts.push(prevSib.textContent);
    }

    // 7. Parent container text (limited to avoid noise)
    const parent = el.parentElement;
    if (parent) {
      // Check for nearby label-like elements
      const nearbyLabels = parent.querySelectorAll(
        "label, .label, [class*='label'], legend, h3, h4"
      );
      nearbyLabels.forEach((lbl) => parts.push(lbl.textContent));
    }

    return parts
      .join(" ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  // ----------------------------------------------------------
  // Match a label string against our keyword map
  // Returns the storage key if matched, or null
  // ----------------------------------------------------------
  function matchField(labelText) {
    for (const [key, keywords] of Object.entries(FIELD_KEYWORDS)) {
      for (const kw of keywords) {
        if (labelText.includes(kw.toLowerCase())) {
          return key;
        }
      }
    }
    return null;
  }

  // ----------------------------------------------------------
  // Fill a <select> element by fuzzy-matching option text
  // ----------------------------------------------------------
  function fillSelect(selectEl, value) {
    if (!value) return false;
    const valueLower = value.toLowerCase();
    const options = Array.from(selectEl.options);

    // Try exact match first, then partial match
    let match =
      options.find((o) => o.text.trim().toLowerCase() === valueLower) ||
      options.find((o) => o.text.trim().toLowerCase().includes(valueLower)) ||
      options.find((o) => valueLower.includes(o.text.trim().toLowerCase()) && o.text.trim().length > 1);

    if (match) {
      selectEl.value = match.value;
      selectEl.dispatchEvent(new Event("input", { bubbles: true }));
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  // ----------------------------------------------------------
  // Fill a text input
  // ----------------------------------------------------------
  function fillInput(inputEl, value) {
    if (!value) return false;
    // Use native setter to bypass React/framework controlled inputs
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeSetter.call(inputEl, value);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    inputEl.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  // ----------------------------------------------------------
  // Fill radio buttons within a group
  // ----------------------------------------------------------
  function fillRadioGroup(radioEl, value) {
    if (!value) return false;
    const valueLower = value.toLowerCase();
    const name = radioEl.name;
    if (!name) return false;

    const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
    for (const radio of radios) {
      const label = getFieldLabelText(radio);
      if (
        label.includes(valueLower) ||
        valueLower.includes(radio.value.toLowerCase()) ||
        radio.value.toLowerCase() === valueLower
      ) {
        radio.checked = true;
        radio.dispatchEvent(new Event("input", { bubbles: true }));
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        radio.click();
        return true;
      }
    }

    // For yes/no questions, try matching the value directly
    if (valueLower === "yes" || valueLower === "no") {
      for (const radio of radios) {
        const radioLabel = getFieldLabelText(radio);
        if (radioLabel.includes(valueLower)) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
          radio.click();
          return true;
        }
      }
    }

    return false;
  }

  // ----------------------------------------------------------
  // Handle custom dropdown widgets (Workday, Greenhouse, etc.)
  // These are typically <div> or <button> elements that open a list.
  // ----------------------------------------------------------
  function fillCustomDropdown(container, value) {
    if (!value) return false;
    const valueLower = value.toLowerCase();

    // Common patterns for custom dropdown triggers
    const trigger = container.querySelector(
      '[role="combobox"], [role="listbox"], [aria-haspopup="listbox"], ' +
      '[aria-haspopup="true"], [class*="select"], [class*="dropdown"], ' +
      'button[class*="trigger"], [data-automation-id*="select"]'
    );

    if (trigger) {
      // Click to open the dropdown
      trigger.click();
      trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

      // Wait briefly for the dropdown to render, then select the option
      setTimeout(() => {
        const options = document.querySelectorAll(
          '[role="option"], [role="menuitem"], [class*="option"], ' +
          '[class*="menu-item"], [class*="listitem"], li[data-value]'
        );
        for (const opt of options) {
          const text = opt.textContent.trim().toLowerCase();
          if (text.includes(valueLower) || valueLower.includes(text)) {
            opt.click();
            return true;
          }
        }
      }, 300);
    }
    return false;
  }

  // ----------------------------------------------------------
  // Main fill logic: scan the page and fill matching fields
  // ----------------------------------------------------------
  function fillFields(settings) {
    let filled = 0;
    const processedRadioGroups = new Set();

    // Collect all form elements
    const elements = document.querySelectorAll(
      'select, input[type="text"], input[type="number"], input[type="radio"], ' +
      'input[type="checkbox"], textarea, [role="combobox"], [role="listbox"]'
    );

    for (const el of elements) {
      // Skip hidden or disabled elements
      if (el.offsetParent === null && el.type !== "radio") continue;
      if (el.disabled) continue;

      const labelText = getFieldLabelText(el);
      if (!labelText) continue;

      const fieldKey = matchField(labelText);
      if (!fieldKey) continue;

      const savedValue = settings[fieldKey];
      if (!savedValue) continue;

      let success = false;

      if (el.tagName === "SELECT") {
        success = fillSelect(el, savedValue);
      } else if (el.type === "radio") {
        // Process each radio group only once
        if (processedRadioGroups.has(el.name)) continue;
        processedRadioGroups.add(el.name);
        success = fillRadioGroup(el, savedValue);
      } else if (el.type === "checkbox") {
        // For checkboxes, check if the value suggests it should be checked
        const check = ["yes", "true", "1"].includes(savedValue.toLowerCase());
        if (el.checked !== check) {
          el.checked = check;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.click();
          success = true;
        }
      } else if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA"
      ) {
        success = fillInput(el, savedValue);
      } else if (
        el.getAttribute("role") === "combobox" ||
        el.getAttribute("role") === "listbox"
      ) {
        success = fillCustomDropdown(el.parentElement || el, savedValue);
      }

      if (success) {
        // Visual feedback: briefly highlight filled fields
        const origOutline = el.style.outline;
        el.style.outline = "2px solid #4361ee";
        setTimeout(() => {
          el.style.outline = origOutline;
        }, 1500);
        filled++;
      }
    }

    // Also scan for custom dropdown widgets that aren't standard form elements
    const customContainers = document.querySelectorAll(
      '[data-automation-id*="formField"], [class*="form-field"], ' +
      '[class*="FormField"], [class*="question"], [class*="field-wrapper"]'
    );

    for (const container of customContainers) {
      const labelText = container.textContent.toLowerCase().replace(/\s+/g, " ").trim();
      const fieldKey = matchField(labelText);
      if (!fieldKey || !settings[fieldKey]) continue;

      // Check if we already filled a standard element in this container
      const hasFilledChild = container.querySelector(
        'select, input[type="text"], input[type="radio"]'
      );
      if (hasFilledChild) continue;

      if (fillCustomDropdown(container, settings[fieldKey])) {
        filled++;
      }
    }

    return filled;
  }

  // ----------------------------------------------------------
  // Floating "Fill EEO" button
  // ----------------------------------------------------------
  function injectFloatingButton() {
    if (document.getElementById("eeo-autofill-btn")) return;

    const btn = document.createElement("button");
    btn.id = "eeo-autofill-btn";
    btn.textContent = "Fill EEO";
    btn.title = "Auto-fill EEO & demographic fields";

    Object.assign(btn.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "999999",
      padding: "10px 18px",
      background: "#4361ee",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "700",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      cursor: "pointer",
      boxShadow: "0 2px 12px rgba(67, 97, 238, 0.4)",
      transition: "background-color 0.2s, transform 0.1s",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#3a56d4";
      btn.style.transform = "scale(1.05)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#4361ee";
      btn.style.transform = "scale(1)";
    });

    btn.addEventListener("click", () => {
      chrome.storage.local.get(null, (settings) => {
        const filled = fillFields(settings);
        // Show brief feedback on the button
        const origText = btn.textContent;
        btn.textContent = filled > 0 ? `Filled ${filled}!` : "No fields found";
        btn.style.background = filled > 0 ? "#198754" : "#dc3545";
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.background = "#4361ee";
        }, 2000);
      });
    });

    document.body.appendChild(btn);
  }

  // ----------------------------------------------------------
  // Listen for fill messages from popup/background
  // ----------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fill") {
      chrome.storage.local.get(null, (settings) => {
        const filled = fillFields(settings);
        sendResponse({ filled });
      });
      return true; // Async response
    }
  });

  // Inject the floating button once the page is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFloatingButton);
  } else {
    injectFloatingButton();
  }
})();
