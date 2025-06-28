let timerInterval;


const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("sendBtn");

const apiKeyInput = document.getElementById("apikey-input");
const saveApiKeyBtn = document.getElementById("save-apikey-btn");

let messages = [];


const AssistantChatSystemPrompt = `
  You are a helpful interviewer for an algorithms and data structures round.

  You should only reply in context to the problem only and help the candidate in the following ways - 

  1. Give hints to the user when asked. Start with small hints only
  2. Listen to users approach and validate the solution.
  3. Ask the candidate about the time and space complexity for the approach. Ask them to optimize if required
  4. Answer the clarifying questions for the candidate.

  Keep the replies to a minimum length. Ask followup questions to the candidate if needed. Let the candidate figure out the solution. 
  Don't give a lot of information away. Be as encouraging as possible
  The candidate does not know the entire problem statement examples and constraints so do not refer to those in responses.

`;

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function startUpdatingTimer(startTime) {
  const timerDisplay = document.getElementById('timer');

  clearInterval(timerInterval); // Prevent multiple intervals

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = formatTime(elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer').textContent = "00:00";
}

saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    chrome.storage.local.set({ openaiKey: key }, () => {
      alert("API Key saved.");
    });
  }
});

// Load existing key into field (optional)
chrome.storage.local.get(["openaiKey"], (result) => {
  if (result.openaiKey) {
    apiKeyInput.value = result.openaiKey;
  }
});


document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const contentBox = document.getElementById('pageContent');
  const summaryBox = document.getElementById('summaryContent');

  // Restore problem content from storage
  chrome.storage.local.get('leetcodeProblem', (data) => {
    if (data.leetcodeProblem) {
      const { title, content } = data.leetcodeProblem;
      contentBox.textContent = `${title}\n\n${content}`;
    }
  });

  chrome.storage.local.get('leetcodeProblemSummary', (data) => {
    if (data.leetcodeProblemSummary) {
      const summary = data.leetcodeProblemSummary;
      summaryBox.innerHTML = `${marked.parse(summary)}`;
    }
  });

  // Load and resume timer if started
  chrome.storage.local.get('startTime', (data) => {
    if (data.startTime) {
      startUpdatingTimer(data.startTime);
    }
  });

  startBtn.addEventListener('click', () => {
    const now = Date.now();
    chrome.storage.local.set({ startTime: now }, () => {
      startUpdatingTimer(now);
    });
    chrome.storage.local.set({ chatMessages: [] }, () => {
      chatBox.innerText='';
      messages = [];
    });
    // Always inject script — even if previously injected
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Script injection failed:', chrome.runtime.lastError.message);
        } else {
          console.log('Content script injected');
        }
      });
    });
  });

  resetBtn.addEventListener('click', () => {
    chrome.storage.local.remove('startTime', () => {
      stopTimer();
    });
  });
});

// document.getElementById('startBtn').addEventListener('click', () => {
  
// });

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LEETCODE_PROBLEM") {
    const { title, content } = message.data;
    // inside your message handler (or after extract)
    chrome.runtime.sendMessage({
      type: "SUMMARIZE_PROBLEM",
      content: `${title}\n\n${content}`
    }, (response) => {
      const summaryBox = document.getElementById('summaryContent');
      if (response.success) {
        summaryBox.innerHTML = `${marked.parse(response.summary)}`;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "DISPLAY_SUMMARY",
            summary: marked.parse(response.summary)
          });
        });
      } else {
        summaryBox.textContent = `${response.error}`;
      }
      
      chrome.storage.local.set({ leetcodeProblemSummary: response.summary }, () => {
        console.log("LeetCode Summary saved");
      });
      systemMessage = `${AssistantChatSystemPrompt}\n\nProblem Statement:\n\n${content}`

      addMessage('system', systemMessage);
    });

    document.getElementById('pageContent').textContent = `${title}\n\n${content}`;
  }
});



function saveMessages(messages) {
  chrome.storage.local.set({ chatMessages: messages });
}

function loadMessages() {
  chrome.storage.local.get('chatMessages', (data) => {
    messages = data.chatMessages;
    console.log('messages 1', messages);
    console.log('chat messages loaded', messages);
    for (const msg of messages) {
      showMessage(msg.role, msg.content);
    }  
    return messages;  
  }); 
}




function addMessage(role, content) {
  showMessage(role, content);
  if (role !== 'thinking') {
    messages.push({ role, content });
    saveMessages(messages);
    console.log('messages stored on local', messages);
  }
}

function showMessage(role, content) {
  if (role  !== "system") {
    const msg = document.createElement("div");
    msg.className = "message " + (role === "user" ? "user" : "bot");
    msg.innerHTML = `<strong>${role === "user" ? "You" : "GPT"}:</strong><br> ${marked.parse(content)}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

async function sendMessage() {
  const userText = chatInput.value.trim();
  if (!userText) return;

  addMessage("user", userText);
  chatInput.value = "";

  addMessage("thinking", "<em>Thinking...</em>");

  chrome.runtime.sendMessage({
    type: "CHATGPT_MESSAGE",
    messages
  }, (response) => {
    chatBox.lastChild.remove(); // remove "Thinking..."
    addMessage("assistant", response.reply);
  });
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function init() {
  console.log('dom content loaded');
  messages = loadMessages();
}

init();