// ─── CONFIG ─────────────────────────────────────────────────────────────────
// API_BASE is set in config.js — GitHub Pages ke liye woh file edit karo
const API = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE.replace(/\/$/, '') : '';

// Direct keys from config.js or localStorage
const getSKey = () => localStorage.getItem('STABILITY_API_KEY') || (typeof STABILITY_API_KEY !== 'undefined' ? STABILITY_API_KEY : '');
const getOKey = () => localStorage.getItem('OPENAI_API_KEY') || (typeof OPENAI_API_KEY !== 'undefined' ? OPENAI_API_KEY : '');
const getHKey = () => localStorage.getItem('HUGGINGFACE_API_KEY') || (typeof HUGGINGFACE_API_KEY !== 'undefined' ? HUGGINGFACE_API_KEY : '');

// Check if keys are available
const hasKeys = () => !!(getSKey() || getOKey() || getHKey());

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === id);
  });
  window.scrollTo(0, 0);
  if (id === 'studio') renderStudioControls();
  if (id === 'chat') { loadConvs(); }
  if (id === 'settings') { loadSettingsUI(); }
}

function loadSettingsUI() {
  document.getElementById('set-skey').value = localStorage.getItem('STABILITY_API_KEY') || '';
  document.getElementById('set-okey').value = localStorage.getItem('OPENAI_API_KEY') || '';
  document.getElementById('set-hkey').value = localStorage.getItem('HUGGINGFACE_API_KEY') || '';
}

function saveSettings() {
  const skey = document.getElementById('set-skey').value.trim();
  const okey = document.getElementById('set-okey').value.trim();
  const hkey = document.getElementById('set-hkey').value.trim();
  localStorage.setItem('STABILITY_API_KEY', skey);
  localStorage.setItem('OPENAI_API_KEY', okey);
  localStorage.setItem('HUGGINGFACE_API_KEY', hkey);
  
  const status = document.getElementById('settings-status');
  status.style.color = '#22c55e';
  status.textContent = '✅ Settings save ho gayi hain!';
  setTimeout(() => { status.textContent = ''; }, 3000);
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});

// ─── STUDIO ──────────────────────────────────────────────────────────────────
let currentTool = 'txt2img';
let resultImageUrl = null;
let inputImgData = '';
let maskImgData = '';
let styleImgData = '';

const tools = {
  txt2img: { label: 'Text to Image', color: '#f97316', endpoint: 'generate' },
  img2img: { label: 'Image to Image', color: '#8b5cf6', endpoint: 'img2img' },
  upscale: { label: 'AI Upscaler', color: '#22c55e', endpoint: 'upscale' },
  inpaint: { label: 'Inpainting', color: '#eab308', endpoint: 'inpaint' },
  sketch: { label: 'Sketch to Art', color: '#ec4899', endpoint: 'sketch' },
  style: { label: 'Style Transfer', color: '#6366f1', endpoint: 'style' },
  removebg: { label: 'Remove BG', color: '#06b6d4', endpoint: 'remove-bg' },
};

function selectTool(tool) {
  currentTool = tool;
  inputImgData = ''; maskImgData = ''; styleImgData = '';
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  renderStudioControls();
  setResult(null);
}

function renderStudioControls() {
  const c = document.getElementById('studioControls');
  const t = tools[currentTool];
  const sKey = getSKey();
  const hKey = getHKey();
  const modeTxt = (sKey || hKey) ? 'Direct API 🟢' : 'Backend ☁️';
  let html = `<div style="margin-bottom:18px">
    <h3 style="font-size:16px;font-weight:800;margin-bottom:4px">${t.label}</h3>
    <div style="font-size:10px;color:var(--dim)">Mode: ${modeTxt}</div>
  </div>`;

  if (['img2img','inpaint','sketch','removebg','upscale','style'].includes(currentTool)) {
    html += uploadZone('inputImg', currentTool === 'removebg' ? 'Image (BG hatana hai)' : 'Base Image', 'setInputImg');
  }
  if (currentTool === 'inpaint') html += uploadZone('maskImg', 'Mask Image (white = replace area)', 'setMaskImg');
  if (currentTool === 'style') html += uploadZone('styleImg', 'Style Image (source style)', 'setStyleImg');

  if (currentTool !== 'removebg') {
    html += `<div class="form-group"><label>${currentTool === 'style' ? 'Prompt (optional)' : currentTool === 'upscale' ? 'Prompt (optional, for better result)' : 'Prompt *'}</label>
    <textarea class="form-input" id="s-prompt" rows="3" placeholder="${promptPh()}"></textarea></div>`;
  }

  if (currentTool === 'txt2img') {
    html += `<div class="form-group"><label>Negative Prompt</label><input class="form-input" id="s-neg" placeholder="Kya nahi chahiye... (blur, low quality)"/></div>`;
    html += `<div class="form-group"><label>Model Provider</label><select class="form-input" id="s-provider" onchange="renderStudioControls()">
      <option value="stability" ${localStorage.getItem('lastProvider')==='stability'?'selected':''}>Stability AI</option>
      <option value="huggingface" ${localStorage.getItem('lastProvider')==='huggingface'?'selected':''}>Hugging Face</option>
    </select></div>`;
    
    const prov = document.getElementById('s-provider')?.value || localStorage.getItem('lastProvider') || 'stability';
    localStorage.setItem('lastProvider', prov);

    if (prov === 'stability') {
      html += `<div class="form-group"><label>Model</label><select class="form-input" id="s-model">
        <option value="stable-image-core">Stable Image Core (Fast ⚡)</option>
        <option value="stable-image-ultra">Stable Image Ultra (Best ✨)</option>
        <option value="sd3">SD 3.5 Large (Stability)</option>
        <option value="stable-diffusion-xl-1024-v1-0">SDXL 1.0 (Standard)</option>
      </select></div>`;
    } else {
      html += `<div class="form-group"><label>HF Model</label><select class="form-input" id="s-model">
        <option value="black-forest-labs/FLUX.1-dev">FLUX.1-dev (New 🔥)</option>
        <option value="stabilityai/stable-diffusion-3.5-large">SD 3.5 Large</option>
        <option value="stabilityai/stable-diffusion-xl-base-1.0">SDXL 1.0</option>
      </select></div>`;
    }
    html += rangeGroup('s-steps', 'Steps', 10, 50, 30, 5);
    html += rangeGroup('s-cfg', 'CFG Scale', 1, 20, 7, 1);
  }

  if (currentTool === 'img2img') html += rangeGroup('s-strength', 'Strength (kitna change)', 10, 95, 75, 5, '%');
  if (currentTool === 'sketch') html += rangeGroup('s-ctrl', 'Control Strength', 10, 100, 70, 5, '%');
  if (currentTool === 'style') html += rangeGroup('s-fidelity', 'Style Fidelity', 0, 100, 50, 5, '%');

  html += `<button class="generate-btn" id="genBtn" onclick="generate()">✨ Generate Karo</button>`;
  c.innerHTML = html;
}

function promptPh() {
  const ph = {
    txt2img:'Describe karo kya banana chahte ho...', img2img:'Kaise transform karna chahte ho...',
    sketch:'Is sketch ko kaise render karo...', inpaint:'Masked area mein kya banana chahte ho...',
    upscale:'Optional: image describe karo...', style:'Style description (optional)...'
  };
  return ph[currentTool] || 'Describe your image...';
}

function uploadZone(id, label, setter) {
  return `<div class="form-group">
    <label>${label}</label>
    <div class="upload-zone" id="uz-${id}" onclick="triggerUpload('${id}','${setter}')" ondragover="event.preventDefault()" ondrop="handleDrop(event,'${id}','${setter}')">
      <div id="uz-${id}-content"><div class="upload-icon">⬆️</div><div class="upload-text">Click karo ya drag karo (PNG/JPG)</div></div>
    </div>
    <input type="file" id="fi-${id}" accept="image/*" style="display:none" onchange="handleFileInput(this,'${id}','${setter}')"/>
  </div>`;
}

function rangeGroup(id, label, min, max, val, step, suffix='') {
  return `<div class="range-group">
    <label>${label}: <span id="${id}-val">${val}${suffix}</span></label>
    <input type="range" id="${id}" min="${min}" max="${max}" value="${val}" step="${step}" oninput="document.getElementById('${id}-val').textContent=this.value+'${suffix}'"/>
  </div>`;
}

function triggerUpload(id, setter) { document.getElementById('fi-' + id).click(); }

function handleFileInput(input, id, setter) {
  if (input.files[0]) readFile(input.files[0], id, setter);
}

function handleDrop(e, id, setter) {
  e.preventDefault();
  if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0], id, setter);
}

function readFile(file, id, setter) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = e.target.result;
    if (setter === 'setInputImg') inputImgData = data;
    else if (setter === 'setMaskImg') maskImgData = data;
    else if (setter === 'setStyleImg') styleImgData = data;
    document.getElementById('uz-' + id + '-content').innerHTML = `<img src="${data}" style="max-height:160px;border-radius:10px;object-fit:contain"/>`;
  };
  reader.readAsDataURL(file);
}

async function generate() {
  const prompt = document.getElementById('s-prompt')?.value || '';
  if (currentTool !== 'removebg' && currentTool !== 'upscale' && !prompt.trim()) {
    alert('Prompt likhein!'); return;
  }
  if (['img2img','inpaint','sketch','removebg','upscale','style'].includes(currentTool) && !inputImgData) {
    alert('Image upload karein!'); return;
  }
  if (currentTool === 'inpaint' && !maskImgData) { alert('Mask image upload karein!'); return; }
  if (currentTool === 'style' && !styleImgData) { alert('Style image upload karein!'); return; }

  setLoading(true);
  const t = tools[currentTool];
  let body = {};

  if (currentTool === 'txt2img') {
    body = {
      prompt, negativePrompt: document.getElementById('s-neg')?.value || undefined,
      model: document.getElementById('s-model').value,
      steps: parseInt(document.getElementById('s-steps')?.value || 30),
      cfgScale: parseInt(document.getElementById('s-cfg')?.value || 7),
      width: 1024, height: 1024
    };
  } else if (currentTool === 'img2img') {
    body = { imageBase64: inputImgData, prompt, strength: parseInt(document.getElementById('s-strength').value)/100 };
  } else if (currentTool === 'upscale') {
    body = { imageBase64: inputImgData, prompt: prompt || undefined };
  } else if (currentTool === 'inpaint') {
    body = { imageBase64: inputImgData, maskBase64: maskImgData, prompt };
  } else if (currentTool === 'sketch') {
    body = { imageBase64: inputImgData, prompt, controlStrength: parseInt(document.getElementById('s-ctrl').value)/100 };
  } else if (currentTool === 'style') {
    body = { imageBase64: inputImgData, styleImageBase64: styleImgData, prompt, fidelity: parseInt(document.getElementById('s-fidelity').value)/100 };
  } else if (currentTool === 'removebg') {
    body = { imageBase64: inputImgData };
  }

  const sKey = getSKey();
  const hKey = getHKey();
  const provider = document.getElementById('s-provider')?.value || 'stability';

  if (provider === 'huggingface' && hKey) {
    try {
      const imageUrl = await callHuggingFaceDirect(body.prompt, document.getElementById('s-model').value, hKey);
      setResult(imageUrl);
      return;
    } catch (err) {
      handleError('Hugging Face Error: ' + err.message); return;
    } finally {
      setLoading(false);
    }
  }

  if (sKey) {
    try {
      const imageUrl = await callStabilityDirect(currentTool, body, sKey);
      setResult(imageUrl);
      return;
    } catch (err) {
      handleError('Stability API Error: ' + err.message); return;
    } finally {
      setLoading(false);
    }
  }

  try {
    const res = await fetch(API + '/api/images/' + t.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
    const data = await res.json();
    setResult(data.imageUrl);
    loadHistory();
  } catch (err) {
    handleError('Error: ' + err.message);
  } finally {
    setLoading(false);
  }
}

function handleError(msg) {
  let displayMsg = msg;
  if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid api key')) {
    displayMsg = '❌ API Key galat hai! Settings mein jaakar sahi key daalein.';
  } else if (msg.includes('429')) {
    displayMsg = '⏳ Bahut saare requests! Thodi der baad try karein (Rate Limit).';
  } else if (msg.includes('Failed to connect') || msg.includes('NetworkError')) {
    displayMsg = '🌐 Network problem! Check karein ki aapka internet chal raha hai ya API base URL sahi hai.';
  }
  alert(displayMsg);
}

async function callStabilityDirect(tool, body, key) {
  const fd = new FormData();
  let url = 'https://api.stability.ai/v2beta/stable-image/generate/core';
  
  if (tool === 'txt2img') {
    fd.append('prompt', body.prompt);
    if (body.negativePrompt) fd.append('negative_prompt', body.negativePrompt);
    
    if (body.model === 'stable-image-ultra') {
        url = 'https://api.stability.ai/v2beta/stable-image/generate/ultra';
    } else if (body.model === 'sd3') {
        url = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
        fd.append('model', 'sd3.5-large');
    } else if (body.model === 'stable-diffusion-xl-1024-v1-0') {
        // SDXL usually requires the SDXL endpoint or core. 
        // Core is a good default, but for specific SDXL 1.0 we might need a different path if available.
        url = 'https://api.stability.ai/v2beta/stable-image/generate/core';
    }
  } else if (tool === 'img2img') {
    url = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
    fd.append('image', await base64ToBlob(body.imageBase64));
    fd.append('prompt', body.prompt);
    fd.append('strength', body.strength);
    fd.append('mode', 'image-to-image');
    fd.append('model', 'sd3');
  } else if (tool === 'upscale') {
    url = 'https://api.stability.ai/v2beta/stable-image/upscale/conservative';
    fd.append('image', await base64ToBlob(body.imageBase64));
    if (body.prompt) fd.append('prompt', body.prompt);
  } else if (tool === 'inpaint') {
    url = 'https://api.stability.ai/v2beta/stable-image/edit/inpaint';
    fd.append('image', await base64ToBlob(body.imageBase64));
    fd.append('mask', await base64ToBlob(body.maskBase64));
    fd.append('prompt', body.prompt);
  } else if (tool === 'sketch') {
    url = 'https://api.stability.ai/v2beta/stable-image/control/sketch';
    fd.append('image', await base64ToBlob(body.imageBase64));
    fd.append('prompt', body.prompt);
    fd.append('control_strength', body.controlStrength);
  } else if (tool === 'style') {
    url = 'https://api.stability.ai/v2beta/stable-image/control/style';
    fd.append('image', await base64ToBlob(body.imageBase64));
    fd.append('style_image', await base64ToBlob(body.styleImageBase64));
    fd.append('prompt', body.prompt);
    fd.append('fidelity', body.fidelity);
  } else if (tool === 'removebg') {
    url = 'https://api.stability.ai/v2beta/stable-image/edit/remove-background';
    fd.append('image', await base64ToBlob(body.imageBase64));
  }

  fd.append('output_format', 'png');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
    body: fd
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.errors ? err.errors.join(', ') : err.message || 'API Error');
  }
  const data = await res.json();
  return `data:image/png;base64,${data.image}`;
}

async function base64ToBlob(b64) {
  const res = await fetch(b64);
  return await res.blob();
}

async function callHuggingFaceDirect(prompt, model, key) {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'HF API Error');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function setLoading(on) {
  document.getElementById('genBtn').disabled = on;
  document.getElementById('genBtn').textContent = on ? '⏳ Processing...' : '✨ Generate Karo';
  document.getElementById('resultContent').innerHTML = on
    ? '<div class="loader"></div>'
    : '<div class="result-placeholder"><div class="p-icon">🎨</div><p>Generate karoge to image yahan aayegi</p></div>';
  document.getElementById('dlBtn').style.display = 'none';
}

function setResult(url) {
  resultImageUrl = url;
  if (url) {
    document.getElementById('resultContent').innerHTML = `<img class="result-img" src="${url}" alt="Generated"/>`;
    document.getElementById('dlBtn').style.display = 'flex';
  }
}

function downloadResult() {
  if (!resultImageUrl) return;
  const a = document.createElement('a');
  a.href = resultImageUrl;
  a.download = `_technical_01_${currentTool}_${Date.now()}.png`;
  a.click();
}

let historyOpen = false;
function toggleHistory() {
  historyOpen = !historyOpen;
  document.getElementById('historyContent').style.display = historyOpen ? 'block' : 'none';
  document.getElementById('historyArrow').textContent = historyOpen ? '▲' : '▼';
  if (historyOpen) loadHistory();
}

async function loadHistory() {
  if (getSKey() || getHKey()) {
    const grid = document.getElementById('historyGrid');
    grid.innerHTML = '<p style="color:var(--dim);font-size:12px;padding:12px">Direct API mode mein history save nahi hoti.</p>';
    return;
  }
  try {
    const res = await fetch(API + '/api/images/history');
    const data = await res.json();
    const grid = document.getElementById('historyGrid');
    if (!data.images || data.images.length === 0) {
      grid.innerHTML = '<p style="color:var(--dim);font-size:12px;padding:12px">Koi image abhi tak nahi bani</p>'; return;
    }
    grid.innerHTML = data.images.map(img => `
      <div class="history-item" onclick="setResult('${img.imageUrl}')">
        <img src="${img.imageUrl}" alt="${img.prompt}" loading="lazy"/>
        <div class="history-badge">${(img.model||'').replace('stable-','').substring(0,6)}</div>
      </div>`).join('');
  } catch (e) {}
}

// ─── CHAT ────────────────────────────────────────────────────────────────────
let convs = [];
let activeConvId = null;
let messages = [];
let isStreaming = false;
let micActive = false;     // mic input
let voiceEnabled = true;   // speaker output — AI speaks responses
let isListening = false;
let isSpeaking = false;
let recognition = null;

// ── Voice helper: pick best available voice ──
function getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  const pref = ['Google हिन्दी','Microsoft Swara','Swara','Kalpana',
    'Google UK English Female','Google US English','Samantha','Karen','Moira','Victoria'];
  for (const name of pref) {
    const v = voices.find(x => x.name.toLowerCase().includes(name.toLowerCase()));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith('hi'))
      || voices.find(v => v.lang.startsWith('en'))
      || (voices.length ? voices[0] : null);
}

function cleanForSpeech(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/[*_#>~]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 600);
}

// Init SpeechRecognition
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  recognition = new SR();
  recognition.lang = 'hi-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    isListening = false;
    updateMicStatus();
    sendChatMsg(text);
  };
  recognition.onerror = () => { isListening = false; updateMicStatus(); };
  recognition.onend = () => { isListening = false; updateMicStatus(); };
}

// Load voices async (Chrome needs this)
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

function startListening() {
  if (!recognition || isStreaming || isSpeaking) return;
  try { recognition.start(); isListening = true; updateMicStatus(); } catch(e) {}
}

function speak(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = cleanForSpeech(text);
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  const voice = getBestVoice();
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  else { u.lang = 'hi-IN'; }
  u.rate = 0.88;
  u.pitch = 1.05;
  u.volume = 1;
  isSpeaking = true;
  updateMicStatus();
  u.onend = () => {
    isSpeaking = false;
    if (micActive) setTimeout(startListening, 700);
    updateMicStatus();
  };
  u.onerror = () => { isSpeaking = false; updateMicStatus(); };
  window.speechSynthesis.speak(u);
}

function toggleMic() {
  if (!recognition) { alert('Mic support nahi mila. Google Chrome mein try karein.'); return; }
  micActive = !micActive;
  if (!micActive) { recognition.stop(); setIsListening(false); }
  else { startListening(); }
  updateMicStatus();
  renderChatArea();
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  if (!voiceEnabled) { window.speechSynthesis?.cancel(); isSpeaking = false; }
  updateMicStatus();
  renderChatArea();
}

function updateMicStatus() {
  const el = document.getElementById('micStatus');
  if (!el) return;
  const speaking = isSpeaking || window.speechSynthesis?.speaking;
  if (!micActive && !speaking) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  if (isListening) { el.className = 'mic-status visible listening'; el.textContent = '🎙️ Sun raha hoon — bolein!'; }
  else if (speaking) { el.className = 'mic-status visible speaking'; el.textContent = '🔊 AI bol raha hai...'; }
  else { el.className = 'mic-status visible ready'; el.textContent = '🎤 Jawab ke baad mic shuru hoga'; }
}

async function loadConvs() {
  if (getOKey()) {
    if (convs.length === 0) {
      convs = [{ id: 'local', title: 'Local Chat' }];
      activeConvId = 'local';
    }
    renderConvList();
    renderChatArea();
    return;
  }
  try {
    const res = await fetch(API + '/api/openai/conversations');
    convs = await res.json();
    renderConvList();
    if (convs.length > 0 && !activeConvId) { activeConvId = convs[0].id; await loadMessages(); }
    renderChatArea();
  } catch(e) { renderChatArea(); }
}

async function createConv() {
  if (getOKey()) {
    const id = Date.now();
    convs.unshift({ id, title: 'New Chat ' + new Date().toLocaleTimeString() });
    activeConvId = id;
    messages = [];
    renderConvList();
    renderChatArea();
    return;
  }
  try {
    const res = await fetch(API + '/api/openai/conversations', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title:'New Conversation'})
    });
    const conv = await res.json();
    convs.unshift(conv);
    activeConvId = conv.id;
    messages = [];
    renderConvList();
    renderChatArea();
  } catch(e) {}
}

async function deleteConv(id, e) {
  e.stopPropagation();
  await fetch(API + '/api/openai/conversations/' + id, {method:'DELETE'});
  convs = convs.filter(c => c.id !== id);
  if (activeConvId === id) { activeConvId = convs[0]?.id || null; messages = []; if (activeConvId) await loadMessages(); }
  renderConvList();
  renderChatArea();
}

function selectConv(id) {
  activeConvId = id;
  messages = [];
  renderChatArea();
  loadMessages().then(() => { if (activeConvId) renderChatArea(); });
}

async function loadMessages() {
  if (!activeConvId) return;
  try {
    const res = await fetch(API + '/api/openai/conversations/' + activeConvId + '/messages');
    messages = await res.json();
    renderMessages();
  } catch(e) {}
}

function renderConvList() {
  const el = document.getElementById('convList');
  if (!el) return;
  el.innerHTML = convs.map(c => `
    <div class="conv-item ${activeConvId === c.id ? 'active' : ''}" onclick="selectConv(${c.id})">
      <span class="conv-title">💬 ${c.title}</span>
      <button class="conv-del" onclick="deleteConv(${c.id}, event)" title="Delete">🗑</button>
    </div>`).join('') || '<p style="color:var(--dim);font-size:12px;padding:8px">Koi conversation nahi</p>';
}

function renderChatArea() {
  const el = document.getElementById('chatContent');
  if (!el) return;
  if (!activeConvId) {
    el.innerHTML = `<div class="no-conv"><div class="empty-icon">🤖</div>
      <h3 style="font-size:18px;font-weight:700;color:rgba(255,255,255,0.7);margin-bottom:8px">_technical_01 AI</h3>
      <p style="font-size:14px;max-width:300px">Naya chat shuru karo!</p>
      <button class="btn btn-orange" style="margin-top:20px" onclick="createConv()">Start New Chat</button></div>`;
    return;
  }
  const statusTxt = isStreaming ? 'Soch raha hoon...' : isSpeaking ? 'Bol raha hoon...' : isListening ? 'Sun raha hoon...' : 'Online';
  const oKey = getOKey();
  const modeTxt = oKey ? 'Direct' : 'Backend';
  const lastModel = localStorage.getItem('lastChatModel') || 'gpt-4o-mini';
  el.innerHTML = `
    <div class="chat-topbar">
      <div class="chat-topbar-info">
        <div class="chat-avatar">🤖</div>
        <div>
          <div class="chat-name">_technical_01 AI <small style="font-size:9px;opacity:0.5">(${modeTxt})</small></div>
          <div class="chat-status" id="chatStatus" style="color:${isSpeaking?'#22c55e':isListening?'#ef4444':isStreaming?'#f97316':'rgba(255,255,255,0.4)'}">${statusTxt}</div>
        </div>
      </div>
      <div class="chat-controls">
        <select id="chatModel" class="form-input" style="width:auto;padding:4px 8px;font-size:11px;height:32px;margin-right:8px;background:rgba(255,255,255,0.05)" onchange="localStorage.setItem('lastChatModel', this.value)">
          <option value="gpt-4o-mini" ${lastModel==='gpt-4o-mini'?'selected':''}>GPT-4o Mini</option>
          <option value="gpt-4o" ${lastModel==='gpt-4o'?'selected':''}>GPT-4o (Advanced)</option>
          <option value="o1-mini" ${lastModel==='o1-mini'?'selected':''}>o1 Mini</option>
        </select>
        <button class="ctrl-btn ${voiceEnabled ? (isSpeaking ? 'voice-on' : 'voice-on') : 'voice-off'}" onclick="toggleVoice()" title="${voiceEnabled?'Voice band karo':'Voice chaalu karo'}" style="background:${voiceEnabled?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.05)'};color:${voiceEnabled?'#22c55e':'rgba(255,255,255,0.3)'}">
          ${voiceEnabled ? '🔊' : '🔇'}
        </button>
        <button class="ctrl-btn ${micActive ? (isListening ? 'mic-listen' : 'mic-on') : 'mic-off'}" onclick="toggleMic()" title="${micActive?'Mic band karo':'Mic se bolein'}">
          ${micActive ? (isListening ? '🎙️' : '🎤') : '🎤'}
        </button>
      </div>
    </div>
    <div class="messages" id="msgContainer"></div>
    <div class="chat-input-area">
      <div class="mic-status ${micActive || isSpeaking ? 'visible' : ''} ${isListening ? 'listening' : isSpeaking ? 'speaking' : 'ready'}" id="micStatus" style="display:${micActive||isSpeaking?'block':'none'}">
        ${isListening ? '🎙️ Sun raha hoon — bolein!' : isSpeaking ? '🔊 AI bol raha hai...' : '🎤 Jawab ke baad mic shuru hoga'}
      </div>
      <div class="input-row">
        <textarea class="chat-textarea" id="chatInput" placeholder="${micActive ? 'Ya type bhi kar sakte hain...' : 'Koi bhi sawaal poochho... (Enter = send)'}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatFromInput()}" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight, 200)+'px'" rows="1"></textarea>
        <button onclick="toggleMic()" title="Mic" style="width:48px;height:48px;border-radius:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all .2s;background:${micActive?(isListening?'#ef4444':'rgba(249,115,22,0.15)'):'rgba(255,255,255,0.06)'};${isListening?'animation:pulse 1s infinite':''}">
          ${micActive ? '🎤' : '🎙️'}
        </button>
        <button class="send-btn" onclick="sendChatFromInput()" id="sendBtn">➤</button>
      </div>
      <div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.18);margin-top:8px">
        ${voiceEnabled ? '🔊 Voice ON — AI jawab bolega' : '🔇 Voice OFF — ऊपर speaker dabao'} • _technical_01
      </div>
    </div>`;
  renderMessages();
}

function renderMessages() {
  const el = document.getElementById('msgContainer');
  if (!el) return;
  if (messages.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--dim);font-size:13px;margin:auto;padding:40px 0">Koi bhi sawaal poochho — Hindi ya English mein!<br/><small style="opacity:.5">Mic button dabao aur bolein bhi 🎤</small></div>`;
    return;
  }
  el.innerHTML = messages.map(msg => `
    <div class="msg-row ${msg.role}">
      <div class="msg-avatar ${msg.role}">${msg.role === 'user' ? '👤' : '🤖'}</div>
      <div class="msg-bubble ${msg.role}">${formatMsg(msg.content)}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function formatMsg(content) {
  let html = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Code Blocks: ```lang ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = 'code-' + Math.random().toString(36).substr(2, 9);
    return `<div class="code-block">
      <div class="code-header">
        <span>${lang || 'code'}</span>
        <button class="copy-btn" data-code-id="${id}">Copy</button>
      </div>
      <pre><code class="language-${lang}" id="${id}">${code.trim()}</code></pre>
    </div>`;
  });

  html = html
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" onerror="this.style.display=\'none\'"/>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>')
    .replace(/\n/g,'<br/>');

  setTimeout(() => {
    document.querySelectorAll('pre code').forEach((el) => {
      if (!el.dataset.highlighted) {
        hljs.highlightElement(el);
      }
    });
  }, 0);

  return html;
}

// Global click listener for copy buttons
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-btn')) {
    const codeId = e.target.getAttribute('data-code-id');
    const code = document.getElementById(codeId).innerText;
    navigator.clipboard.writeText(code).then(() => {
      const oldText = e.target.innerText;
      e.target.innerText = 'Copied!';
      setTimeout(() => e.target.innerText = oldText, 2000);
    });
  }
});

function addMsg(role, content) {
  messages.push({id:Date.now(),role,content});
  renderMessages();
}

function appendStream(text) {
  const el = document.getElementById('msgContainer');
  if (!el) return;
  let streamEl = document.getElementById('streamMsg');
  if (!streamEl) {
    streamEl = document.createElement('div');
    streamEl.className = 'msg-row';
    streamEl.id = 'streamMsg';
    streamEl.innerHTML = '<div class="msg-avatar bot">🤖</div><div class="msg-bubble bot" id="streamBubble"></div>';
    el.appendChild(streamEl);
  }
  document.getElementById('streamBubble').innerHTML = formatMsg(text) + '<span class="cursor"></span>';
  el.scrollTop = el.scrollHeight;
}

function sendChatFromInput() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  const txt = ta.value.trim();
  if (txt) { ta.value = ''; sendChatMsg(txt); }
}

async function sendChatMsg(content) {
  if (!content.trim() || !activeConvId || isStreaming) return;
  addMsg('user', content);
  isStreaming = true;
  const oKey = getOKey();
  const model = document.getElementById('chatModel')?.value || 'gpt-4o-mini';
  document.getElementById('sendBtn') && (document.getElementById('sendBtn').disabled = true);
  document.getElementById('chatStatus') && (document.getElementById('chatStatus').textContent = 'Soch raha hoon...');
  let fullText = '';

  const systemPrompt = "You are '_technical_01 AI', a highly advanced AI assistant created by Aman Meena. You provide expert-level, professional, and helpful responses in Hindi and English. You use Markdown for formatting and always provide clear, high-quality information.";

  try {
    let res;
    if (oKey) {
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ];
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${oKey}` },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          stream: true
        })
      });
    } else {
      res = await fetch(API + '/api/openai/conversations/' + activeConvId + '/messages', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({content})
      });
    }
    
    if (!res.ok) throw new Error('Failed to connect to AI');

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += dec.decode(value, {stream:true});
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        let text = line.trim();
        if (!text) continue;
        if (text === 'data: [DONE]') break;
        if (text.startsWith('data: ')) {
          try {
            const d = JSON.parse(text.slice(6));
            const chunk = oKey ? d.choices[0]?.delta?.content : d.content;
            if (chunk) { fullText += chunk; appendStream(fullText); }
          } catch(e) {}
        }
      }
    }
    const streamEl = document.getElementById('streamMsg');
    if (streamEl) streamEl.remove();
    if (fullText) { addMsg('assistant', fullText); speak(fullText); }
    if (!oKey) await loadMessages();
  } catch(err) {
    const streamEl = document.getElementById('streamMsg');
    if (streamEl) streamEl.remove();
    let errMsg = err.message;
    if (errMsg.includes('401')) errMsg = 'API Key galat hai! Settings check karein.';
    addMsg('assistant', '❌ Error: ' + errMsg);
  } finally {
    isStreaming = false;
    document.getElementById('sendBtn') && (document.getElementById('sendBtn').disabled = false);
    document.getElementById('chatStatus') && (document.getElementById('chatStatus').textContent = micActive ? (isListening ? 'Sun raha hoon...' : 'Mic ON') : 'Online');
  }
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────
async function submitContact() {
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const message = document.getElementById('cf-msg').value.trim();
  if (!name || !email || !message) { alert('Naam, email aur message zaroori hain!'); return; }
  const btn = document.getElementById('cfBtn');
  btn.disabled = true; btn.textContent = '⏳ Bhej rahe hain...';
  try {
    const res = await fetch(API + '/api/contact', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name, email, subject: document.getElementById('cf-subject').value, message})
    });
    if (res.ok) {
      document.getElementById('contactFormWrap').innerHTML = `
        <div class="success-msg"><div class="success-icon">✅</div><h3 style="font-size:24px;font-weight:800;color:#22c55e;margin-bottom:8px">Pahunch Gaya!</h3>
        <p style="color:var(--muted)">Jald hi sampark kiya jaayega.</p>
        <button class="btn btn-ghost" style="margin-top:20px" onclick="location.reload()">Nayi Message</button></div>`;
    } else { btn.disabled=false; btn.textContent='📤 Message Bhejein'; alert('Error! Dobara try karein.'); }
  } catch(e) { btn.disabled=false; btn.textContent='📤 Message Bhejein'; alert('Network error! Dobara try karein.'); }
}

// ─── INIT ────────────────────────────────────────────────────────────────────
renderStudioControls();