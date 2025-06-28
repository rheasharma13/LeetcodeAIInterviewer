// content.js

(() => {
  function extractLeetcodeProblem() {
    const titleAnchor = document.querySelector('div.text-title-large a');
    const title = titleAnchor ? titleAnchor.textContent.trim() : 'Title not found';

    const descriptionDiv = document.querySelector('div.elfjS[data-track-load="description_content"]');
    const content = descriptionDiv ? descriptionDiv.innerText.trim() : 'Description not found';

    return { title, content };
  }

  const problemData = extractLeetcodeProblem();

  // Save to storage
  chrome.storage.local.set({ leetcodeProblem: problemData }, () => {});

  // Also send it to the popup (if open)
  chrome.runtime.sendMessage({ type: "LEETCODE_PROBLEM", data: problemData });
})();


function injectSummaryToProblemPage(summaryText) {
  const problemDesc = document.querySelector('div.elfjS[data-track-load="description_content"]');
  if (!problemDesc) {
    console.error("Problem description not found");
    return;
  }
  problemDesc.innerHTML = "";
  hideExtraElements();
  // Avoid duplicating
  if (document.querySelector("#gpt-summary-box")) return;

  const summaryBox = document.createElement("div");
  summaryBox.id = "gpt-summary-box";
  summaryBox.style.marginTop = "24px";
  summaryBox.style.padding = "16px";
  summaryBox.style.background = "#000000";
  summaryBox.style.border = "1px solid #ccc";
  summaryBox.style.borderRadius = "8px";
  summaryBox.style.whiteSpace = "pre-wrap";
  summaryBox.style.fontSize = "14px";

  summaryBox.innerHTML = `<strong>📌 Summary (AI):</strong><br>${summaryText}`;

  problemDesc.appendChild(summaryBox);
}

// Assuming this is called from popup/sidepanel via message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DISPLAY_SUMMARY") {
    injectSummaryToProblemPage(message.summary);
    sendResponse({ success: true });
  }
});

function hideExtraElements() {
   // Hide extra LeetCode info section below problem (examples, follow-ups, etc.)
  const extrasDiv = document.querySelector('div.mt-6.flex.flex-col.gap-3');
  if (extrasDiv) {
    extrasDiv.style.display = "none";
  }

  // Hide extra LeetCode info section below problem (examples, follow-ups, etc.)
  const tagsDiv = document.querySelector('flex gap-1');
  if (tagsDiv) {
    tagsDiv.style.display = "none";
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  function extractLeetcodeCode() {
    const lines = document.querySelectorAll('.view-line');
    const codeLines = [];

    lines.forEach(line => {
      codeLines.push(line.innerText);
    });

    return codeLines.join('\n');
  }
  if (msg.type === "EXTRACT_CODE") {
    console.log('in extract code');
    const code = extractLeetcodeCode();
    console.log('parsed extract code', code);
    chrome.storage.local.set({ leetcodeProblemCode: code }, () => {});
    sendResponse({ code });

    console.log('response sent');
    return true;
  }
});