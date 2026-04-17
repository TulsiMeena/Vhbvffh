// ─── CONFIG ─────────────────────────────────────────────────────────────────
// API_BASE is set in config.js — GitHub Pages ke liye woh file edit karo
const API = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE.replace(/\/$/, '') : '';

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === id);
  });
  window.scrollTo(0, 0);
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }
});

// ─── CONTACT ─────────────────────────────────────────────────────────────────
async function submitContact() {
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();
  const message = document.getElementById('cf-msg').value.trim();
  const subject = document.getElementById('cf-subject').value.trim();

  if (!name || !email || !message) {
    alert('Naam, email aur message zaroori hain!');
    return;
  }

  const btn = document.getElementById('cfBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Bhej rahe hain...';

  try {
    const res = await fetch(API + '/api/contact', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({name, email, subject, message})
    });

    if (res.ok) {
      document.getElementById('contactFormWrap').innerHTML = `
        <div class="success-msg">
          <div class="success-icon">✅</div>
          <h3 style="font-size:24px;font-weight:800;color:#22c55e;margin-bottom:8px">Pahunch Gaya!</h3>
          <p style="color:var(--muted)">Jald hi sampark kiya jaayega.</p>
          <button class="btn btn-ghost" style="margin-top:20px" onclick="location.reload()">Nayi Message</button>
        </div>`;
    } else {
      btn.disabled=false;
      btn.textContent='📤 Message Bhejein';
      alert('Error! Dobara try karein.');
    }
  } catch(e) {
    btn.disabled=false;
    btn.textContent='📤 Message Bhejein';
    alert('Network error! Dobara try karein.');
  }
}
