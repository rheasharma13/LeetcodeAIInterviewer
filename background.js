// background.js

const GROQ_API_KEY = '<INSERT_GROQ_KEY_HERE>';

const ProblemDescriptionSystemMessage = `
  'You are an interviewer for a software engineering role. 
  You have to format the question in a way it is usually asked in an interview. 
  Keep it open for discussion, a little vague and short. include one simple example if you can with explaination.
  Do not add constraints or complexity expectations for the problem.
`


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUMMARIZE_PROBLEM') {
    chrome.storage.local.get(["openaiKey"], ({ openaiKey }) => {
      if (!openaiKey) {
        alert("No API key set. Please enter it in the extension.");
        return;
      }
      console.log('api key', openaiKey);

      const prompt = `Problem:\n\n${message.content}`;

      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { role: 'system', content: ProblemDescriptionSystemMessage },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      })
      .then(res => res.json())
      .then(data => {
        const summary = data.choices?.[0]?.message?.content || 'No summary returned.';
        console.log('OpenAI data:', data);
        sendResponse({ success: true, summary });
      })
      .catch(error => {
        console.error('OpenAI error:', error);
        sendResponse({ success: false, error: error.toString() });
      });
    });

    return true; // Keeps message channel open for async response
  }
});

chrome.action.onClicked.addListener((tab) => {
  try {
    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true,
    });
    chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    console.error("Failed to open side panel:", err);
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHATGPT_MESSAGE") {
    chrome.storage.local.get(["openaiKey"], ({ openaiKey }) => {
      if (!openaiKey) {
        alert("No API key set. Please enter it in the extension.");
        return;
      }
    
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: message.messages
        })
      })
      .then(res => res.json())
      .then(data => {
        const reply = data.choices?.[0]?.message?.content || 'No reply returned.';
        console.log('OpenAI reply data:', data);
        sendResponse({ success: true, reply });
      })
      .catch(error => {
        console.error('OpenAI reply error:', error);
        sendResponse({ success: false, error: error.toString() });
      });
    });
    return true; // Keeps message channel open for async response
  }
});