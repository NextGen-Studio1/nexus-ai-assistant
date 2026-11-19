// API Base (automatically adapts whether loaded via http://localhost:8000 or file://)
const API_BASE = (window.location.protocol === 'file:' || !window.location.port) ? 'http://localhost:8000' : '';

// Session ID Management (unique per browser tab)
let sessionId = sessionStorage.getItem('nexus_agent_session_id');
if (!sessionId) {
  sessionId = 'user_' + Math.random().toString(36).substring(2, 9);
  sessionStorage.setItem('nexus_agent_session_id', sessionId);
}

// Conversation context memory
let clientMemoryHistory = [];

// Built-in tools
const clientTools = {
  calculator: (expr) => {
    try {
      let clean = expr
        .replace(/what is/gi, '')
        .replace(/calculate/gi, '')
        .replace(/evaluate/gi, '')
        .replace(/solve/gi, '')
        .replace(/and show step-by-step/gi, '')
        .replace(/the/gi, '')
        .replace(/square root of\s*(\d+)/gi, (m, g) => `Math.sqrt(${g})`)
        .replace(/math\.sqrt/gi, 'Math.sqrt')
        .replace(/sqrt/gi, 'Math.sqrt')
        .replace(/math\.pow/gi, 'Math.pow')
        .replace(/pow/gi, 'Math.pow')
        .replace(/math\.pi/gi, 'Math.PI')
        .replace(/pi/gi, 'Math.PI')
        .replace(/multiplied by/gi, '*')
        .replace(/divided by/gi, '/')
        .replace(/plus/gi, '+')
        .replace(/minus/gi, '-')
        .replace(/times/gi, '*')
        .replace(/\?/g, '')
        .trim();

      const match = clean.match(/(?:Math\.[a-zA-Z0-9\(\)]+|\d|\()[0-9\.\s\+\-\*\/\(\)Math]+(?:\)|\d)/);
      const toEval = match ? match[0] : clean;
      const fn = new Function('return (' + toEval + ')');
      return fn();
    } catch (e) {
      return null;
    }
  },

  get_weather: (city) => {
    const db = {
      "delhi": "🌤️ **Delhi:** 34°C, Partly Cloudy with 45% humidity",
      "mumbai": "🌧️ **Mumbai:** 28°C, Light Rain with 80% humidity",
      "london": "☁️ **London:** 15°C, Overcast with 70% humidity",
      "new york": "🌞 **New York:** 22°C, Sunny with 55% humidity",
      "tokyo": "🌸 **Tokyo:** 18°C, Clear with 60% humidity"
    };
    const c = city.toLowerCase().trim();
    for (const [k, v] of Object.entries(db)) {
      if (c.includes(k) || k.includes(c)) return v;
    }
    return null;
  },

  knowledge_base: (topic) => {
    const kb = {
      "langchain": "**LangChain** is a popular framework for building applications powered by large language models. It helps developers connect LLMs with external tools, knowledge bases, and conversational memory.",
      "machine learning": "**Machine Learning** is a branch of artificial intelligence where computers learn patterns directly from data to make decisions or predictions without being manually programmed for every scenario.",
      "neural network": "**Neural Networks** are computing systems inspired by the human brain. They use interconnected layers of artificial neurons to process complex data such as images, voice, and text.",
      "llm": "**Large Language Models (LLMs)** are advanced AI systems (like GPT-4, LLaMA, and Gemini) trained on vast amounts of text to understand, write, and converse naturally in human language.",
      "ai agent": "**AI Agents** are autonomous AI systems that don't just answer questions—they can reason, plan multi-step workflows, use external tools (like calculators or web search), and take actions to accomplish tasks on your behalf.",
      "groq": "**Groq** is an AI hardware company known for its custom LPU (Language Processing Unit) chips, designed to run AI models with ultra-fast speed and low latency.",
      "react": "**ReAct (Reason + Act)** is an intelligent prompting technique that allows an AI to alternate between thinking about what to do ('Reason') and taking specific actions using tools ('Act') until it solves the user's request."
    };
    const t = topic.toLowerCase().trim();
    for (const [k, v] of Object.entries(kb)) {
      if (t.includes(k) || k.includes(t)) return v;
    }
    return null;
  }
};

// Conversational User-Facing Agent
function runConversationalAgent(userInput) {
  const inputLower = userInput.toLowerCase();

  // 1. User introduces their name
  const nameMatch = userInput.match(/my name is\s+([a-zA-Z0-9_\-\s]+?)(?:\.|$|,|!)/i);
  if (nameMatch) {
    const detectedName = nameMatch[1].trim();
    sessionStorage.setItem('nexus_user_name', detectedName);
    return `Nice to meet you, **${detectedName}**! 👋 I've remembered your name and will keep it in mind as we chat.`;
  }

  // 2. User asks what their name is
  if (inputLower.includes('my name') || inputLower.includes('who am i') || inputLower.includes('remember my name')) {
    const storedName = sessionStorage.getItem('nexus_user_name');
    if (storedName) {
      return `Your name is **${storedName}**! You introduced yourself earlier in our conversation. 😊`;
    }
    for (const turn of clientMemoryHistory) {
      const match = turn.human.match(/my name is\s+([a-zA-Z0-9_\-\s]+?)(?:\.|$|,|!)/i);
      if (match) {
        return `Your name is **${match[1].trim()}**! You told me earlier in our conversation. 😊`;
      }
    }
    return `You haven't told me your name yet! Feel free to say *"My name is..."* and I'll remember it.`;
  }

  // 3. User asks for weather
  const cities = ['mumbai', 'delhi', 'london', 'new york', 'tokyo'];
  const matchedCities = cities.filter(c => inputLower.includes(c));
  if (matchedCities.length > 0 || inputLower.includes('weather')) {
    if (matchedCities.length > 0) {
      const weatherReports = matchedCities
        .map(c => clientTools.get_weather(c))
        .filter(Boolean);
      return `Here is the current weather update for you:\n\n* ${weatherReports.join('\n* ')}`;
    } else {
      return `I can check current weather forecasts for **Delhi, Mumbai, London, New York,** and **Tokyo**! Which city would you like to check?`;
    }
  }

  // 4. User asks for calculations / math
  if (inputLower.includes('calculate') || inputLower.includes('sqrt') || inputLower.includes('multiplied') || inputLower.includes('+') || inputLower.includes('*') || inputLower.includes('/') || inputLower.includes('plus') || inputLower.includes('minus')) {
    const res = clientTools.calculator(userInput);
    if (res !== null) {
      return `The result is **${res}**.`;
    }
  }

  // 5. User asks about tech concepts
  const topics = ['langchain', 'ai agent', 'react', 'machine learning', 'neural network', 'llm', 'groq'];
  const matchedTopics = topics.filter(t => inputLower.includes(t));
  if (matchedTopics.length > 0) {
    const explanations = matchedTopics
      .map(t => clientTools.knowledge_base(t))
      .filter(Boolean);
    return explanations.join('\n\n');
  }

  // 6. Greetings & friendly conversation
  if (inputLower === 'hi' || inputLower === 'hello' || inputLower === 'hey') {
    const storedName = sessionStorage.getItem('nexus_user_name');
    if (storedName) {
      return `Hello **${storedName}**! How can I help you today?`;
    }
    return `Hello! How can I help you today? You can ask me to solve calculations, check the weather, explain tech topics, or just chat!`;
  }

  if (inputLower.includes('thank')) {
    return `You're very welcome! Let me know if you need anything else. 😊`;
  }

  // Default friendly response
  return `I understand! I'm here to help you with:\n\n* 🧮 **Calculations:** Try *"Calculate sqrt(625) * 4"*\n* 🌤️ **Live Weather:** Try *"What's the weather in Mumbai?"*\n* 💡 **Explanations:** Try *"Explain how AI Agents work"*\n* 🧠 **Remembering Context:** Try telling me your name or favorite topic!`;
}

// DOM Elements
const messagesArea = document.getElementById('messagesArea');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const welcomeCard = document.getElementById('welcomeCard');
const newChatBtn = document.getElementById('newChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');
const toast = document.getElementById('toast');

// Toast notification helper
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// Textarea auto-expansion
if (userInput) {
  userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    if (this.value.trim().length > 0) {
      sendBtn.removeAttribute('disabled');
    } else {
      sendBtn.setAttribute('disabled', 'true');
    }
  });

  userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (this.value.trim().length > 0) {
        submitUserMessage();
      }
    }
  });
}

// Mobile Sidebar Toggle & Overlay
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeMobileSidebar() {
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('show');
  }
}

function openMobileSidebar() {
  if (sidebar) {
    sidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('show');
  }
}

if (toggleSidebarBtn && sidebar) {
  toggleSidebarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains('open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 820 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && e.target !== toggleSidebarBtn) {
        closeMobileSidebar();
      }
    }
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

// Auto close drawer when selecting tool or new chat on small screens
document.querySelectorAll('.tool-chip, #newChatBtn').forEach(el => {
  el.addEventListener('click', () => {
    if (window.innerWidth <= 820) {
      closeMobileSidebar();
    }
  });
});

// Scroll to bottom button
if (messagesArea && scrollBottomBtn) {
  messagesArea.addEventListener('scroll', () => {
    const distFromBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;
    if (distFromBottom > 150) {
      scrollBottomBtn.style.display = 'flex';
    } else {
      scrollBottomBtn.style.display = 'none';
    }
  });

  scrollBottomBtn.addEventListener('click', () => {
    messagesArea.scrollTo({
      top: messagesArea.scrollHeight,
      behavior: 'smooth'
    });
  });
}

// Tool chips in sidebar
document.querySelectorAll('.tool-chip').forEach(chip => {
  chip.style.cursor = 'pointer';
  chip.addEventListener('click', () => {
    const tool = chip.getAttribute('data-tool');
    let prompt = "";
    if (tool === 'calculator') prompt = "What is the square root of 625 multiplied by 4?";
    else if (tool === 'weather') prompt = "What is the current weather in Mumbai and Delhi?";
    else if (tool === 'kb') prompt = "What is an AI Agent and how does it work?";
    
    if (prompt && userInput) {
      userInput.value = prompt;
      submitUserMessage();
    }
  });
});

// Prompt capability cards
document.querySelectorAll('.card-prompt').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.getAttribute('data-prompt');
    if (prompt && userInput) {
      userInput.value = prompt;
      submitUserMessage();
    }
  });
});

// Format timestamp
function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Append chat message
function appendMessage(role, text) {
  if (welcomeCard) {
    welcomeCard.style.display = 'none';
  }

  const row = document.createElement('div');
  row.className = `chat-row ${role}`;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  if (role === 'user') {
    avatar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  } else {
    avatar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
  }

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'msg-wrapper';

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `<span>${role === 'user' ? 'You' : 'Assistant'}</span><span>•</span><span>${getTimestamp()}</span>`;

  // Bubble
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (role === 'agent') {
    if (typeof marked !== 'undefined') {
      bubble.innerHTML = marked.parse(text);
    } else {
      bubble.textContent = text;
    }
  } else {
    bubble.textContent = text;
  }

  wrapper.appendChild(meta);
  wrapper.appendChild(bubble);

  // If agent, add quick action buttons
  if (role === 'agent') {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    // Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'bubble-btn';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span>Copy</span>
    `;
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    };

    // Text to Speech Button
    if ('speechSynthesis' in window) {
      const speakBtn = document.createElement('button');
      speakBtn.className = 'bubble-btn';
      speakBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        <span>Listen</span>
      `;
      speakBtn.onclick = () => {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*_#`]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      };
      actions.appendChild(speakBtn);
    }

    actions.appendChild(copyBtn);
    wrapper.appendChild(actions);
  }

  row.appendChild(avatar);
  row.appendChild(wrapper);
  messagesArea.appendChild(row);

  messagesArea.scrollTo({
    top: messagesArea.scrollHeight,
    behavior: 'smooth'
  });
}

// Submit message handler
async function submitUserMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  // Add user message to UI
  appendMessage('user', message);
  userInput.value = '';
  userInput.style.height = 'auto';
  if (sendBtn) sendBtn.setAttribute('disabled', 'true');

  // Show thinking indicator
  if (typingIndicator) {
    typingIndicator.style.display = 'flex';
  }
  messagesArea.scrollTo({
    top: messagesArea.scrollHeight,
    behavior: 'smooth'
  });

  try {
    const payload = {
      message: message,
      session_id: sessionId
    };

    // Try backend server if available
    let agentResponse = null;
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        agentResponse = data.response;
      }
    } catch (networkErr) {
      // Backend not running, handled by conversational agent
    }

    if (!agentResponse) {
      await new Promise(r => setTimeout(r, 500));
      agentResponse = runConversationalAgent(message);
    }

    if (typingIndicator) typingIndicator.style.display = 'none';
    appendMessage('agent', agentResponse);
    clientMemoryHistory.push({ human: message, ai: agentResponse });

  } catch (err) {
    if (typingIndicator) typingIndicator.style.display = 'none';
    const fallbackAnswer = runConversationalAgent(message);
    appendMessage('agent', fallbackAnswer);
    clientMemoryHistory.push({ human: message, ai: fallbackAnswer });
  }
}

// Form submit event
if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitUserMessage();
  });
}

// Clear / Reset Functionality
async function resetConversation() {
  try {
    await fetch(`${API_BASE}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
  } catch (err) {}

  clientMemoryHistory = [];
  sessionStorage.removeItem('nexus_user_name');
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  messagesArea.innerHTML = '';
  if (welcomeCard) {
    welcomeCard.style.display = 'flex';
    messagesArea.appendChild(welcomeCard);
  }
  showToast('New conversation started!');
}

if (newChatBtn) newChatBtn.addEventListener('click', resetConversation);
if (clearChatBtn) clearChatBtn.addEventListener('click', resetConversation);
