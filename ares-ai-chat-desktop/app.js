const STORAGE_KEY = 'ares_ai_chat_state_v1';
const DEFAULT_PROFILE = {
  name: 'You',
  avatar: 'Y'
};


const storage = createStorage();

const elements = {
  history: document.getElementById('chatHistory'),
  form: document.getElementById('chatForm'),
  input: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  resetBtn: document.getElementById('resetBtn'),
  profileBtn: document.getElementById('profileBtn'),
  profileDialog: document.getElementById('profileDialog'),
  profileForm: document.getElementById('profileForm'),
  closeProfileBtn: document.getElementById('closeProfileBtn'),
  cancelProfileBtn: document.getElementById('cancelProfileBtn'),
  userNameDisplay: document.getElementById('userNameDisplay'),
  userAvatar: document.getElementById('userAvatar'),
  userNameInput: document.getElementById('userNameInput'),
  userAvatarInput: document.getElementById('userAvatarInput'),
  conversationStatus: document.getElementById('conversationStatus'),
  template: document.getElementById('messageTemplate')
};

const state = loadState();
let typingTimeoutId = null;
let typingMessageId = null;

renderProfile();
renderMessages();
autoResizeInput();
elements.input.focus();

// Main UI events.
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage();
});

elements.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

elements.input.addEventListener('input', autoResizeInput);

elements.resetBtn.addEventListener('click', () => {
  if (!window.confirm('Clear the saved conversation for this browser?')) {
    return;
  }

  clearTypingState();
  state.messages = createDefaultMessages();
  saveState();
  renderMessages();
  setStatus('Conversation reset.');
});

elements.profileBtn.addEventListener('click', openProfileDialog);

elements.closeProfileBtn.addEventListener('click', closeProfileDialog);

elements.cancelProfileBtn.addEventListener('click', closeProfileDialog);

elements.profileForm.addEventListener('submit', (event) => {
  event.preventDefault();

  state.profile.name = normalizeName(elements.userNameInput.value);
  state.profile.avatar = normalizeAvatar(elements.userAvatarInput.value);
  saveState();
  renderProfile();
  closeProfileDialog();
  addMessage({
    role: 'system',
    author: 'System',
    avatar: '•',
    text: `${state.profile.name} updated their profile.`
  });
});

if (elements.profileDialog) {
  elements.profileDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeProfileDialog();
  });
}

function sendMessage() {
  const text = elements.input.value.trim();

  if (!text || typingMessageId) {
    return;
  }

  addMessage({
    role: 'user',
    author: state.profile.name,
    avatar: state.profile.avatar,
    text
  });

  elements.input.value = '';
  autoResizeInput();
  setStatus('Ares is thinking...');
  showTypingIndicator();

  typingTimeoutId = window.setTimeout(() => {
    const reply = buildAiReply(text);
    typingTimeoutId = null;
    removeTypingIndicator();
    addMessage({
      role: 'ai',
      author: 'Ares',
      avatar: 'AI',
      text: reply
    });
    setStatus('Ready to help.');
  }, 900);
}

function addMessage({ role, author, avatar, text, timestamp = new Date().toISOString() }) {
  state.messages.push({
    id: createId(),
    role,
    author,
    avatar,
    text,
    timestamp
  });

  saveState();
  renderMessages();
}

function renderMessages() {
  elements.history.innerHTML = '';

  state.messages.forEach((message) => {
    elements.history.appendChild(createMessageElement(message));
  });

  scrollHistoryToBottom();
}

function createMessageElement(message) {
  const fragment = elements.template.content.cloneNode(true);
  const article = fragment.querySelector('.message');
  const avatar = fragment.querySelector('.message-avatar');
  const author = fragment.querySelector('.message-author');
  const time = fragment.querySelector('.message-time');
  const text = fragment.querySelector('.message-text');

  article.classList.add(message.role);
  article.dataset.messageId = message.id;
  avatar.textContent = message.avatar;
  author.textContent = message.author;
  time.textContent = formatTimestamp(message.timestamp);
  time.dateTime = message.timestamp;

  if (message.role === 'typing') {
    text.textContent = '';
    text.append('Thinking');
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      dot.setAttribute('aria-hidden', 'true');
      text.append(dot);
    }
  } else {
    text.textContent = message.text;
  }

  return fragment;
}

function showTypingIndicator() {
  removeTypingIndicator();
  const typingMessage = {
    id: createId(),
    role: 'typing',
    author: 'Ares',
    avatar: 'AI',
    text: 'Thinking',
    timestamp: new Date().toISOString()
  };

  typingMessageId = typingMessage.id;
  elements.history.appendChild(createMessageElement(typingMessage));
  scrollHistoryToBottom();
}

function removeTypingIndicator() {
  if (!typingMessageId) {
    return;
  }

  const typingElement = elements.history.querySelector(`[data-message-id="${typingMessageId}"]`);
  if (typingElement) {
    typingElement.remove();
  }

  typingMessageId = null;
}

function clearTypingState() {
  if (typingTimeoutId) {
    window.clearTimeout(typingTimeoutId);
    typingTimeoutId = null;
  }

  removeTypingIndicator();
}

function openProfileDialog() {
  elements.userNameInput.value = state.profile.name;
  elements.userAvatarInput.value = state.profile.avatar;

  if (typeof elements.profileDialog.showModal === 'function') {
    elements.profileDialog.showModal();
  } else {
    elements.profileDialog.setAttribute('open', 'open');
  }

  elements.userNameInput.focus();
}

function closeProfileDialog() {
  if (elements.profileDialog.open && typeof elements.profileDialog.close === 'function') {
    elements.profileDialog.close();
  } else {
    elements.profileDialog.removeAttribute('open');
  }
}

function renderProfile() {
  elements.userNameDisplay.textContent = state.profile.name;
  elements.userAvatar.textContent = state.profile.avatar;
}

function setStatus(message) {
  elements.conversationStatus.textContent = message;
}

function scrollHistoryToBottom() {
  elements.history.scrollTop = elements.history.scrollHeight;
}

function autoResizeInput() {
  elements.input.style.height = 'auto';
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 180)}px`;
}

function loadState() {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) {
      return createDefaultState();
    }

    const parsed = JSON.parse(saved);
    const profile = {
      name: normalizeName(parsed?.profile?.name),
      avatar: normalizeAvatar(parsed?.profile?.avatar)
    };
    const messages = Array.isArray(parsed?.messages) && parsed.messages.length
      ? parsed.messages.map(sanitizeMessage).filter(Boolean)
      : createDefaultMessages();

    return { profile, messages };
  } catch (error) {
    console.warn('Failed to restore chat state, using defaults instead.', error);
    return createDefaultState();
  }
}

function saveState() {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createStorage() {
  try {
    const candidate = window.localStorage;
    const probeKey = `${STORAGE_KEY}_probe`;
    candidate.setItem(probeKey, '1');
    candidate.removeItem(probeKey);
    return candidate;
  } catch (error) {
    const memoryStore = new Map();
    return {
      getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
      setItem: (key, value) => memoryStore.set(key, String(value)),
      removeItem: (key) => memoryStore.delete(key)
    };
  }
}

function createDefaultState() {
  return {
    profile: { ...DEFAULT_PROFILE },
    messages: createDefaultMessages()
  };
}

function createDefaultMessages() {
  return [
    {
      id: createId(),
      role: 'system',
      author: 'System',
      avatar: '•',
      text: 'Welcome to Ares Chat. Your conversation is saved locally in this browser.',
      timestamp: new Date().toISOString()
    },
    {
      id: createId(),
      role: 'ai',
      author: 'Ares',
      avatar: 'AI',
      text: 'Hi! Ask me anything, brainstorm an idea, or test the chat experience.',
      timestamp: new Date().toISOString()
    }
  ];
}

function sanitizeMessage(message) {
  if (!message || typeof message.text !== 'string') {
    return null;
  }

  const role = ['system', 'user', 'ai'].includes(message.role) ? message.role : 'system';
  return {
    id: createId(),
    role,
    author: typeof message.author === 'string' && message.author.trim()
      ? message.author.trim()
      : role === 'user'
        ? DEFAULT_PROFILE.name
        : role === 'ai'
          ? 'Ares'
          : 'System',
    avatar: normalizeAvatar(message.avatar || (role === 'user' ? DEFAULT_PROFILE.avatar : role === 'ai' ? 'AI' : '•')),
    text: message.text,
    timestamp: isValidDate(message.timestamp) ? message.timestamp : new Date().toISOString()
  };
}

function normalizeName(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 24) : DEFAULT_PROFILE.name;
}

function normalizeAvatar(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 2).toUpperCase()
    : DEFAULT_PROFILE.avatar;
}

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildAiReply(input) {
  const cleanedInput = input.replace(/\s+/g, ' ').trim();
  const lowerInput = cleanedInput.toLowerCase();

  if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
    return `Hello ${state.profile.name}! I'm ready to help you explore ideas, summarize notes, or continue this demo conversation.`;
  }

  if (lowerInput.includes('help')) {
    return 'Try asking for a summary, brainstorm, or next steps. This demo keeps the chat history in local storage so you can refresh without losing context.';
  }

  if (lowerInput.includes('time')) {
    return `The current local time on your device is ${formatTimestamp(new Date().toISOString())}.`;
  }

  const prompts = [
    `You said: "${cleanedInput}". Ares would treat that as the latest conversation state and build the next response from it.`,
    `I saved your message and would use it as context for the next model request. For now, here's a simulated follow-up: what part of "${cleanedInput}" should we expand on?`,
    `This demo is ready for a real model integration point. Right now I'm simulating a response to: "${cleanedInput}".`
  ];

  return prompts[Math.floor(Math.random() * prompts.length)];
}
