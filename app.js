// ─── CONFIG & API KEYS ───────────────────────────────────────────────────────
const API = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE.replace(/\/$/, '') : '';
const getOKey = () => localStorage.getItem('OPENAI_API_KEY') || (typeof OPENAI_API_KEY !== 'undefined' ? OPENAI_API_KEY : '');

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + id);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === id);
  });
  window.scrollTo(0, 0);

  // Stop vision tracking if navigating away from vision page
  if (id !== 'vision' && visionActive) stopVision();

  if (id === 'chat') { loadConvs(); }
  if (id === 'settings') { loadSettingsUI(); }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('open');
}

window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function loadSettingsUI() {
  const okeyInput = document.getElementById('set-okey');
  if (okeyInput) okeyInput.value = localStorage.getItem('OPENAI_API_KEY') || '';
}

function saveSettings() {
  const okey = document.getElementById('set-okey').value.trim();
  localStorage.setItem('OPENAI_API_KEY', okey);
  const status = document.getElementById('settings-status');
  if (status) {
    status.style.color = '#22c55e';
    status.textContent = '✅ Settings saved successfully!';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }
}

// ─── CHAT ASSISTANT ─────────────────────────────────────────────────────────
let convs = [];
let activeConvId = null;
let messages = [];
let isStreaming = false;

async function loadConvs() {
  if (getOKey() && convs.length === 0) {
    convs = [{ id: 'local', title: 'Main Assistant' }];
    activeConvId = 'local';
  }
  renderConvList();
  renderChatArea();
}

async function createConv() {
  const id = Date.now();
  convs.unshift({ id, title: 'New Chat ' + new Date().toLocaleTimeString() });
  activeConvId = id;
  messages = [];
  renderConvList();
  renderChatArea();
}

function selectConv(id) {
  activeConvId = id;
  messages = []; // In a real app, load from history
  renderChatArea();
}

function renderConvList() {
  const el = document.getElementById('convList');
  if (!el) return;
  el.innerHTML = convs.map(c => `
    <div class="conv-item ${activeConvId === c.id ? 'active' : ''}" onclick="selectConv(${c.id})">
      <span class="conv-title">💬 ${c.title}</span>
    </div>`).join('') || '<p style="color:var(--dim);font-size:12px;padding:8px">No history</p>';
}

function renderChatArea() {
  const el = document.getElementById('chatContent');
  if (!el) return;
  if (!activeConvId) {
    el.innerHTML = `<div class="no-conv"><div class="empty-icon">🤖</div>
      <h3>Advanced AI Assistant</h3>
      <button class="btn btn-orange" onclick="createConv()">Start New Chat</button></div>`;
    return;
  }
  el.innerHTML = `
    <div class="chat-topbar">
      <div class="chat-topbar-info"><div class="chat-avatar">🤖</div><div class="chat-name">_technical_01 AI</div></div>
    </div>
    <div class="messages" id="msgContainer"></div>
    <div class="chat-input-area">
      <div class="input-row">
        <textarea class="chat-textarea" id="chatInput" placeholder="Poochho kya poochna hai... (Paste Amazon link for AR)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatFromInput()}"></textarea>
        <button class="send-btn" onclick="sendChatFromInput()" id="sendBtn">➤</button>
      </div>
    </div>`;
  renderMessages();
}

function renderMessages() {
  const el = document.getElementById('msgContainer');
  if (!el) return;
  if (messages.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--dim);margin-top:40px">AI Chat shuru karein...</div>';
  } else {
    el.innerHTML = messages.map(msg => `
      <div class="msg-row ${msg.role}">
        <div class="msg-avatar ${msg.role}">${msg.role === 'user' ? '👤' : '🤖'}</div>
        <div class="msg-bubble ${msg.role}">${formatMsg(msg.content)}</div>
      </div>`).join('');
  }
  el.scrollTop = el.scrollHeight;
}

function formatMsg(content) {
  let html = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => `<pre><code class="hljs">${code.trim()}</code></pre>`);
  html = html.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  setTimeout(() => document.querySelectorAll('pre code').forEach(hljs.highlightElement), 0);
  return html;
}

function sendChatFromInput() {
  const ta = document.getElementById('chatInput');
  const txt = ta?.value.trim();
  if (txt) { ta.value = ''; sendChatMsg(txt); }
}

async function sendChatMsg(content) {
  if (!content.trim() || isStreaming) return;
  messages.push({role:'user', content});
  renderMessages();

  const oKey = getOKey();
  if (!oKey) {
    messages.push({role:'assistant', content: '❌ Please setup OpenAI API Key in Settings first.'});
    renderMessages();
    return;
  }

  isStreaming = true;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${oKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {role:'system', content:'You are _technical_01 AI, an advanced assistant. You can recognize Amazon links and guide users to use the AR Studio page for them.'},
          ...messages
        ],
        stream: true
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    messages.push({role:'assistant', content: ''});
    const lastIdx = messages.length - 1;

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            const contentChunk = data.choices[0].delta.content;
            if (contentChunk) {
              fullText += contentChunk;
              messages[lastIdx].content = fullText;
              renderMessages();
            }
          } catch(e) {}
        }
      }
    }
  } catch(err) {
    messages.push({role:'assistant', content: 'Error: ' + err.message});
    renderMessages();
  } finally {
    isStreaming = false;
  }
}

// ─── AI VISION (HAND & FACE) ────────────────────────────────────────────────
let visionActive = false;
let camera = null;
let hands = null;
let faceMesh = null;

async function startVision() {
  const videoElement = document.getElementById('visionVideo');
  const canvasElement = document.getElementById('visionCanvas');
  const placeholder = document.getElementById('visionPlaceholder');
  const canvasCtx = canvasElement.getContext('2d');

  if (visionActive) return;
  visionActive = true;
  placeholder.style.display = 'none';

  // Mediapipe Hands
  hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
  hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  hands.onResults(results => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
        drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
      }
    }
    canvasCtx.restore();
  });

  // Mediapipe FaceMesh
  faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  faceMesh.onResults(results => {
    if (results.multiFaceLandmarks) {
      canvasCtx.save();
      for (const landmarks of results.multiFaceLandmarks) {
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
      }
      canvasCtx.restore();
    }
  });

  camera = new Camera(videoElement, {
    onFrame: async () => {
      if (!visionActive) return;
      await hands.send({image: videoElement});
      await faceMesh.send({image: videoElement});
    },
    width: 640,
    height: 480
  });
  camera.start();
}

function stopVision() {
  visionActive = false;
  if (camera) camera.stop();
  const placeholder = document.getElementById('visionPlaceholder');
  if (placeholder) placeholder.style.display = 'flex';
  const canvasElement = document.getElementById('visionCanvas');
  const canvasCtx = canvasElement?.getContext('2d');
  canvasCtx?.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

// ─── AR STUDIO ───────────────────────────────────────────────────────────────
async function loadAmazonAR() {
  const link = document.getElementById('amazonLink').value.toLowerCase();
  const viewer = document.getElementById('mainViewer');
  const title = document.getElementById('modelTitle');
  const desc = document.getElementById('modelDesc');

  if (!link) { alert('Link paste karein!'); return; }

  const demoModels = {
    chair: {
      name: 'Modern Chair',
      src: 'https://modelviewer.dev/shared-assets/models/Chair.glb',
      poster: 'https://modelviewer.dev/shared-assets/models/Chair.png'
    },
    robot: {
      name: 'Future Robot',
      src: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
      poster: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.png'
    },
    watch: {
      name: 'Luxury Watch',
      src: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb',
      poster: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.png'
    },
    helmet: {
      name: 'Safety Helmet',
      src: 'https://modelviewer.dev/shared-assets/models/DamagedHelmet.glb',
      poster: 'https://modelviewer.dev/shared-assets/models/DamagedHelmet.png'
    },
    mixer: {
      name: 'Kitchen Mixer',
      src: 'https://modelviewer.dev/shared-assets/models/Mixer.glb',
      poster: 'https://modelviewer.dev/shared-assets/models/Mixer.png'
    }
  };

  let match = null;
  for (const key in demoModels) {
    if (link.includes(key)) { match = demoModels[key]; break; }
  }

  if (match) {
    viewer.src = match.src;
    viewer.poster = match.poster;
    title.textContent = 'Model: ' + match.name;
    desc.textContent = 'Link parsing success! Displaying ' + match.name + '.';
  } else {
    viewer.src = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
    title.textContent = 'Model: Astronaut (Default)';
    desc.textContent = 'Product model not found for this link, showing default Astronaut.';
  }
}
