// ═══════════════════════════════════════════════════════════════
//  _technical_01  —  BACKEND API CONFIGURATION
//  GitHub Pages ya kisi bhi static hosting pe deploy karne ke liye
//  sirf niche wala URL apne deployed backend se replace karo
// ═══════════════════════════════════════════════════════════════

var API_BASE = 'https://your-deployed-backend.replit.app';

// ─── DIRECT API KEYS (Optional) ────────────────────────────────
// Agar aapke paas backend nahi hai, toh yahan direct keys daal sakte hain.
// Inhe browser ke localStorage mein bhi save kiya ja sakta hai (Settings se).
var STABILITY_API_KEY = ''; // Enter in Settings tab for security
var OPENAI_API_KEY = '';    // Enter in Settings tab for security
var HUGGINGFACE_API_KEY = ''; // Enter in Settings tab for security

// ---------------------------------------------------------------
//  HOW TO GET YOUR BACKEND URL:
//  1. Replit mein "Deploy" button dabao (top right)
//  2. Deploy hone ke baad URL milega jaise:
//     https://image-gen-xxxxx.replit.app
//  3. Woh URL upar paste karo (quotes ke andar)
//  4. config.js save karo
//  5. GitHub pe push karo — sab AI features kaam karenge!
// ---------------------------------------------------------------
