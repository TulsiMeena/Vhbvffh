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
  // Configured automatically
}


// ─── AI VISION (HAND & FACE RECOGNITION) ───────────────────────────────────
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

    // Draw Hands
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
