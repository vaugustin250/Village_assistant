// ═══════════════════════════════════════════════════════
//  AROGYAM — TRIPLE INNOVATION MASTER JS LOGIC (v4)
// ═══════════════════════════════════════════════════════

const API_BASE = window.location.origin;

// ── Language config ──────────────────────────────────
const LANGS = {
  Tamil:   { code:'ta-IN', voiceLang:'ta' },
  Hindi:   { code:'hi-IN', voiceLang:'hi' },
  English: { code:'en-IN', voiceLang:'en' }
};

const I18N = {
  Tamil: {
    greeting: 'வணக்கம்! நான் ஆரோக்யம். இன்று எப்படி உணர்கிறீர்கள்? 🌿',
    inputPlaceholder: 'எப்படி உணர்கிறீர்கள்...',
    startChat: 'பகுப்பாய்வு செய்',
    sosText: 'அவசரம்! உடனே 108 அழைக்கவும் (தட்டவும்)',
  },
  Hindi: {
    greeting: 'नमस्ते! मैं आरोग्यम हूँ। आज आप कैसा महसूस कर रहे हैं? 🌿',
    inputPlaceholder: 'लक्षण यहाँ टाइप करें...',
    startChat: 'विश्लेषण करें',
    sosText: 'आपातकाल! 108 पर कॉल करने के लिए टैप करें',
  },
  English: {
    greeting: "Hello, I'm Arogyam. How can I help you today? 🌿",
    inputPlaceholder: 'Describe your symptoms...',
    startChat: 'Analyze Selected Pain',
    sosText: 'Tap here to call Ambulance (108) immediately.',
  }
};

let currentLanguage = 'English';
let chatMessages    = [];
let recognition     = null;
let isListening     = false;
let selectedBodyParts = [];
let currentTab      = 'chat';
let profiles        = [];
let activeProfileId = 'default';
let editingEmoji    = '🧑';
let sosVisible      = false;
let userLocation    = { lat: null, lng: null };
let mapInitialized  = false;
let leafletMap      = null;
let globalHeatData  = [];
let heatLayer       = null;

const PREVENTION_TIPS = {
  "Dengue": "Clear stagnant water. Use mosquito nets and repellents. Stay hydrated and monitor for high fever.",
  "Malaria": "Use insecticide-treated nets. Keep surroundings clean and avoid mosquito bites at dusk.",
  "Flu": "Wash hands frequently. Wear a mask in crowded places. Rest and consume warm fluids.",
  "Viral Fever": "Rest thoroughly. Take paracetamol for fever. Drink plenty of water and clear soups.",
  "Typhoid": "Drink only boiled or filtered water. Eat freshly cooked, hot food. Wash hands before eating.",
  "Simulated Biothreat": "This is a live visual test. Do not panic. Evacuate immediately if instructed by authorities."
};

const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function playHaptic(ms = 50) {
  // Vibrate only works after user gesture; silently fail if not available
  if (navigator.vibrate) { 
    try { 
      navigator.vibrate(ms); 
    } catch(e) { 
      // Tracking prevention or gesture requirement - silently ignore
    } 
  }
}

// ════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
  loadProfiles();
  setLanguage('English');
  initTabs();
  sendGreeting();
  renderProfileHeader();
  registerPWA();

  // Try to grab location silently for Epidemic Heatmap
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation.lat = pos.coords.latitude;
      userLocation.lng = pos.coords.longitude;
    }, () => {}, {timeout: 5000});
  }

  $$('.modal-backdrop').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAllModals();
    });
  });

  $$('.bp').forEach(el => el.addEventListener('click', () => selectBodyPart(el)));
});

function registerPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    }).catch(console.error);
  }
}

// ════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════
function initTabs() { switchTab('chat'); }

function switchTab(tab) {
  playHaptic(20);
  currentTab = tab;
  
  $$('.tab-panel').forEach(p => {
    p.classList.remove('active');
    setTimeout(() => { if (!p.classList.contains('active')) p.style.display = 'none'; }, 300);
  });
  
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  
  const panels = { chat:'tabChat', bodymap:'tabBodymap', scanner:'tabScanner', scheme:'tabScheme', heatmap:'tabHeatmap' };
  const target = $(panels[tab]);
  if (target) {
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 10);
  }

  if (tab === 'heatmap') {
    setTimeout(initHeatmap, 350);
  }
}

// ════════════════════════════════════════════════════
//  LANGUAGE
// ════════════════════════════════════════════════════
function setLanguage(lang) {
  currentLanguage = lang;
  applyI18N();
  if (recognition && isListening) { recognition.abort(); isListening = false; resetMicUI(); }
}

function switchLang() {
  playHaptic(20);
  const order = ['Tamil','Hindi','English'];
  const next = order[(order.indexOf(currentLanguage)+1)%3];
  setLanguage(next);
  
  const labels = {
    'Tamil': 'தமிழ்',
    'Hindi': 'हिन्दी',
    'English': 'English'
  };
  $('langBtnLabel').textContent = labels[next];
}

function applyI18N() {
  const t = I18N[currentLanguage];
  if($('chatInput')) $('chatInput').placeholder = t.inputPlaceholder;
  if($('startChatBtnLabel')) $('startChatBtnLabel').textContent = t.startChat;
  if (sosVisible && $('sosText')) $('sosText').textContent = t.sosText;
}

// ════════════════════════════════════════════════════
//  CHAT UI & Outbreak Trigger
// ════════════════════════════════════════════════════
function sendGreeting() {
  const greeting = I18N[currentLanguage].greeting;
  appendAIBubble({ type:'question', message: greeting });
}

$('chatInput').addEventListener('input', e => {
  const hasText = e.target.value.trim().length > 0;
  $('micBtn').style.display = hasText ? 'none' : 'flex';
  $('sendBtn').classList.toggle('hidden', !hasText);
});

async function sendMessage() {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const apiKey = localStorage.getItem('gemini_api_key') || '';
  // If no UI key is provided, we still proceed because the server now uses the .env fallback key

  playHaptic(20);
  input.value = '';
  $('micBtn').style.display = 'flex';
  $('sendBtn').classList.add('hidden');

  chatMessages.push({ role:'user', content: text });
  appendUserBubble(text);
  showTyping();

  try {
    const profile = getActiveProfile();
    const reqBody = {
      messages: chatMessages,
      language: currentLanguage,
      api_key: apiKey,
      profile: profile ? { name:profile.name, age:profile.age, gender:profile.gender } : null
    };

    // Piggyback location for Epidemic Radar Integration (Innovation 3)
    if(userLocation.lat) reqBody.lat = userLocation.lat;
    if(userLocation.lng) reqBody.lng = userLocation.lng;

    const res = await fetch(`${API_BASE}/api/chat`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(reqBody)
    });
    const data = await res.json();
    hideTyping();

    if (!res.ok) throw new Error(data.detail || 'Server error');
    if (data.success) {
      playHaptic(40);
      const result = data.result;
      const aiText = result.message || '';
      chatMessages.push({ role:'model', content: aiText });
      appendAIBubble(result);

      if (result.type === 'advice') {
        handleSeverity(result.severity, result.message);
      }
    }
  } catch(err) {
    hideTyping();
    showToast('Network error, please try again.', 'error');
    playHaptic([50, 50, 50]);
  }
}

function appendUserBubble(text) {
  const div = document.createElement('div');
  div.className = 'chat-bubble msg-user';
  div.textContent = text;
  $('chatMessages').appendChild(div);
  scrollChat();
}

function appendAIBubble(result) {
  const div = document.createElement('div');
  div.className = 'chat-bubble msg-ai';

  let inner = '';
  if (result.type === 'advice') {
    const sev = (result.severity||'MEDIUM').toUpperCase();
    const sevLabel = {LOW:'Low Risk',MEDIUM:'Monitor',HIGH:'High Risk'}[sev] || sev;
    const sevClass = sev.toLowerCase();
    const remedies = Array.isArray(result.home_remedies) ? result.home_remedies : [];
    
    if (sev === 'HIGH') playHaptic([100, 50, 200, 50, 300]);

    inner = `
      <div class="sev-tag ${sevClass}">${sevLabel}</div>
      ${result.message ? `<div style="font-size:15px; margin-bottom:8px;">${escHtml(result.message)}</div>` : ''}
      ${result.what_it_might_be ? `
        <div class="doc-section">
          <div class="doc-section-title">Possible Causes</div>
          <div>${escHtml(result.what_it_might_be)}</div>
        </div>` : ''}
      ${remedies.length ? `
        <div class="doc-section">
          <div class="doc-section-title">Remedies</div>
          <ul class="doc-list">${remedies.map(r=>`<li>${escHtml(r)}</li>`).join('')}</ul>
        </div>` : ''}
      ${result.see_doctor ? `
        <div class="doc-section" style="border-color:var(--text-dark); background:white;">
          <div class="doc-section-title" style="color:var(--text-dark);">Doctor Advice</div>
          <div style="color:var(--blue-primary); font-weight:700;">${escHtml(result.see_doctor)}</div>
        </div>` : ''}`;
  } else {
    inner = `<span style="font-family:var(--font-regional)">${escHtml(result.message||'')}</span>`;
  }

  div.innerHTML = inner;
  $('chatMessages').appendChild(div);
  scrollChat();
  speakText(result.message || result.what_it_might_be || '');
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'chat-bubble msg-ai';
  div.id = 'typingIndicator';
  div.innerHTML = `<div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  $('chatMessages').appendChild(div);
  scrollChat();
}

function hideTyping() {
  if ($('typingIndicator')) $('typingIndicator').remove();
}

function scrollChat() {
  const m = $('chatMessages');
  if(m) setTimeout(() => m.scrollTop = m.scrollHeight, 100);
}

// ════════════════════════════════════════════════════
//  SOS & MICROPHONE
// ════════════════════════════════════════════════════
function handleSeverity(severity, message) {
  const sev = (severity||'').toUpperCase();
  if (sev === 'HIGH') {
    $('sosBar').classList.remove('hidden');
    $('sosText').textContent = I18N[currentLanguage].sosText;
    sosVisible = true;
  } else {
    $('sosBar').classList.add('hidden');
    sosVisible = false;
  }
}

function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Voice not supported.','error'); return; }

  playHaptic([30,30]);
  if (isListening) { recognition && recognition.stop(); isListening = false; resetMicUI(); return; }

  recognition = new SR();
  recognition.lang = LANGS[currentLanguage].code;
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true; $('micBtn').classList.add('recording'); $('chatInput').placeholder = "Listening...";
  };
  recognition.onresult = e => {
    let final = '', interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    $('chatInput').value = final || interim;
    $('chatInput').dispatchEvent(new Event('input'));
  };
  recognition.onerror = () => { isListening = false; resetMicUI(); };
  recognition.onend = () => {
    const val = isListening; isListening = false; resetMicUI();
    if (val && $('chatInput').value.trim()) { playHaptic(20); setTimeout(sendMessage, 400); }
  };
  recognition.start();
}

function resetMicUI() {
  $('micBtn').classList.remove('recording');
  $('chatInput').placeholder = I18N[currentLanguage].inputPlaceholder;
}

let speechVoices = [];
if (window.speechSynthesis) {
  speechVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
      speechVoices = window.speechSynthesis.getVoices();
  };
}

function speakText(text) {
  if (!text) return;
  const langCode = LANGS[currentLanguage].voiceLang; // 'ta', 'hi', 'en'
  
  // For regional languages where Windows often lacks local voices,
  // use the reliable Google Translate TTS endpoint chunk-by-chunk.
  if (currentLanguage === 'Tamil' || currentLanguage === 'Hindi') {
      window.speechSynthesis?.cancel(); // stop any ongoing local TTS
      
      // Split by sentence to avoid 200 character URL limits
      const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
      let i = 0;
      
      function playNext() {
          if (i >= sentences.length) return;
          let chunk = sentences[i].trim();
          if (!chunk) { i++; playNext(); return; }
          
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
          const audio = new Audio(url);
          
          audio.onended = () => { i++; playNext(); };
          audio.onerror = () => { 
              // If network fails, fallback to local Synthesis
              i = sentences.length; 
              fallbackSpeechSynthesis(text); 
          };
          audio.play().catch(() => {
              i = sentences.length;
              fallbackSpeechSynthesis(text);
          });
      }
      playNext();
  } else {
      fallbackSpeechSynthesis(text);
  }
}

function fallbackSpeechSynthesis(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  
  if (speechVoices.length === 0) {
      speechVoices = window.speechSynthesis.getVoices();
  }
  
  const utter = new SpeechSynthesisUtterance(text);
  const fullLangCode = LANGS[currentLanguage].code;
  utter.lang = fullLangCode;
  utter.rate = 1.0;
  
  let selectedVoice = null;
  for (let i = 0; i < speechVoices.length; i++) {
      let v = speechVoices[i];
      if (v.lang === fullLangCode || v.lang.startsWith(fullLangCode.split('-')[0])) {
          selectedVoice = v;
          if (v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Natural")) {
              break; 
          }
      }
  }
  
  if (selectedVoice) {
      utter.voice = selectedVoice;
  }
  
  window.speechSynthesis.speak(utter);
}

// ════════════════════════════════════════════════════
//  PHASE 1: VISION AI SCANNER (Innovation 1)
// ════════════════════════════════════════════════════
function handleScanUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Str = e.target.result.split(',')[1]; // strip data URI block
    const mimeType = file.type;
    await processDocument(base64Str, mimeType);
  };
  reader.readAsDataURL(file);
}

async function processDocument(base64Str, mimeType) {
  const apiKey = localStorage.getItem('gemini_api_key') || '';
  // Proceed with empty apiKey, server will use .env

  playHaptic([40,40]);
  $('scanResultPane').classList.add('hidden');
  $('scanLoading').classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/scan_document`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ image_data: base64Str, mime_type: mimeType, language: currentLanguage, api_key: apiKey })
    });
    const data = await res.json();
    
    $('scanLoading').classList.add('hidden');

    if (!res.ok || !data.success) throw new Error(data.detail || 'Vision AI failed');
    
    playHaptic([50, 100, 50]);
    renderScanResult(data.result);
    
  } catch(err) {
    $('scanLoading').classList.add('hidden');
    showToast('Failed to read document clearly. Try again.', 'error');
  }
}

function renderScanResult(r) {
  $('scanResultPane').classList.remove('hidden');
  
  // Use textContent instead of innerHTML so we don't need escHtml (which breaks ' to &#39;)
  $('scanResultType').textContent = r.document_type || "Medical Document";
  $('scanResultSummary').textContent = r.summary || "";
  
  const f = r.findings || [];
  $('scanResultFindings').innerHTML = f.map(x => `<li>${escHtml(x)}</li>`).join('');
  
  const m = r.medicines_found || [];
  $('scanResultMedicines').innerHTML = m.length ? m.map(x => `<li>${escHtml(x)}</li>`).join('') : "<li>None found</li>";

  const l = r.lifestyle_changes || [];
  if (l.length) {
    $('scanResultLifestyleBox').classList.remove('hidden');
    $('scanResultLifestyle').innerHTML = l.map(x => `<li>${escHtml(x)}</li>`).join('');
  } else {
    $('scanResultLifestyleBox').classList.add('hidden');
  }
  
  $('scanResultAdvice').textContent = r.advice || "Please consult your doctor.";

  // Speak out the summary
  speakText(r.summary);
}

// ════════════════════════════════════════════════════
//  PHASE 2: GOVERNMENT SCHEME RAG (Innovation 2)
// ════════════════════════════════════════════════════
async function triggerSchemeMatch() {
  const disease = $('schemeDisease').value.trim();
  const income = $('schemeIncome').value;
  if(!disease) { showToast('Please enter your illness first', 'error'); playHaptic(100); return; }

  const apiKey = localStorage.getItem('gemini_api_key') || '';
  // Proceed with empty apiKey, server will use .env

  playHaptic(30);
  $('schemeLoading').classList.remove('hidden');
  $('schemeResult').classList.add('hidden');
  $('findSchemeBtn').disabled = true;

  try {
    const activeProf = getActiveProfile() || {age:"Unknown", gender:"Unknown"};
    
    const res = await fetch(`${API_BASE}/api/match_scheme`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
        query: disease, 
        demographics: { financial_status: income, age: activeProf.age, gender: activeProf.gender },
        language: currentLanguage, 
        api_key: apiKey 
      })
    });
    const data = await res.json();
    
    $('schemeLoading').classList.add('hidden');
    $('findSchemeBtn').disabled = false;

    if (!res.ok || !data.success) throw new Error('Matching failed');
    
    playHaptic(100);
    renderSchemeResult(data.result);
    speakText("I found a scheme for you: " + data.result.matched_scheme);
    
  } catch(err) {
    $('schemeLoading').classList.add('hidden');
    $('findSchemeBtn').disabled = false;
    showToast('Failed to match schemes.', 'error');
  }
}

function renderSchemeResult(r) {
  $('schemeResult').classList.remove('hidden');
  $('matchedSchemeName').textContent = escHtml(r.matched_scheme || "No Scheme Found");
  $('schemeWhy').textContent = escHtml(r.why_it_fits || "");
  $('schemeWhat').textContent = escHtml(r.what_it_gives || "");
  
  const d = r.documents_needed || [];
  $('schemeDocs').innerHTML = d.map(x => `<li>📄 ${escHtml(x)}</li>`).join('');
}


// ════════════════════════════════════════════════════
//  PHASE 3: EPIDEMIC OUTBREAK HEATMAP (Innovation 3)
// ════════════════════════════════════════════════════
async function initHeatmap() {
  if (!window.L) return; // Leaflet failed to load
  if (mapInitialized) return;
  mapInitialized = true;

  try {
    // 1. Init Map focused generally on India or user location
    const centerLat = userLocation.lat || 20.5937;
    const centerLng = userLocation.lng || 78.9629;
    const zoomLvl = userLocation.lat ? 12 : 5;

    leafletMap = L.map('map', { zoomControl: false }).setView([centerLat, centerLng], zoomLvl);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(leafletMap);

    // 2. Fetch Anonymous Outbreak Data
    const res = await fetch(`${API_BASE}/api/heatmap`);
    const data = await res.json();
    
    if (data.success && data.result.length > 0) {
      globalHeatData = data.result;
      renderHeatmapList();
    } else {
        $('outbreakList').innerHTML = '<div class="text-center text-gray text-sm">No active outbreaks detected. Stay safe!</div>';
    }

    // Delay map bounds fix
    setTimeout(() => leafletMap.invalidateSize(), 500);
  } catch (err) {
    $('outbreakList').innerHTML = '<div class="text-center text-red text-sm">Failed to connect to Radar System.</div>';
  }
}

function renderHeatmapList() {
    if (heatLayer) leafletMap.removeLayer(heatLayer);
    
    const heatPoints = globalHeatData.map(dp => [dp.lat, dp.lng, dp.weight || 80]);
    heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {0.4: 'yellow', 0.65: 'orange', 1: 'red'}
    }).addTo(leafletMap);

    const container = $('outbreakList');
    container.innerHTML = '';
    
    const diseases = {};
    globalHeatData.forEach(dp => { 
        const d = dp.disease || "Unknown";
        diseases[d] = (diseases[d]||0) + 1; 
    });
    
    for(const [dis, count] of Object.entries(diseases)) {
        if (dis === "Unknown") continue;
        container.innerHTML += `
        <div class="list-item" style="border-left:4px solid var(--red-alert); cursor:pointer;" onclick="filterMapByDisease('${escHtml(dis)}')">
            <b class="text-dark">${escHtml(dis)} Breakout</b>
            <div class="text-xs text-gray mt-1">Found ${count} high-severity reports nearby. Tap to view.</div>
        </div>`;
    }
}

function filterMapByDisease(disease) {
    playHaptic(30);
    
    // UI Updates
    $('resetMapBtn').classList.remove('hidden');
    $('preventionBox').classList.remove('hidden');
    $('preventionText').innerHTML = PREVENTION_TIPS[disease] || "Please consult a doctor for this issue.";
    
    // Filter map
    if (heatLayer) leafletMap.removeLayer(heatLayer);
    const filtered = globalHeatData.filter(d => d.disease === disease);
    
    const heatPoints = filtered.map(dp => [dp.lat, dp.lng, dp.weight || 90]);
    heatLayer = L.heatLayer(heatPoints, {
        radius: 35, // Bigger radius to highlight
        blur: 20,
        maxZoom: 17,
        gradient: {0.2: 'blue', 0.5: 'cyan', 0.8: 'lime', 1: 'red'} // Special highlight color
    }).addTo(leafletMap);

    // Pan to first point of this disease
    if (filtered.length > 0) {
        leafletMap.flyTo([filtered[0].lat, filtered[0].lng], 12, { animate: true, duration: 1 });
    }
}

window.resetMapFilter = function() {
    playHaptic(20);
    $('resetMapBtn').classList.add('hidden');
    $('preventionBox').classList.add('hidden');
    renderHeatmapList(); // Restores all points
    
    if (userLocation.lat) {
        leafletMap.flyTo([userLocation.lat, userLocation.lng], 12, { animate: true });
    } else {
        leafletMap.flyTo([20.5937, 78.9629], 5, { animate: true }); // India center
    }
}

window.simulateThreat = function() {
    playHaptic([100, 50, 100]);
    showToast("LIVE: Simulated Threat Received", "error");
    
    const baseLat = userLocation.lat || 13.0827; // Chennai fallback
    const baseLng = userLocation.lng || 80.2707;
    
    // Generate 5 fake reports around user
    for(let i=0; i<5; i++) {
        globalHeatData.push({
            lat: baseLat + (Math.random() - 0.5) * 0.05,
            lng: baseLng + (Math.random() - 0.5) * 0.05,
            weight: 100,
            disease: "Simulated Biothreat"
        });
    }
    
    renderHeatmapList();
    
    // Auto-select it after 1 second
    setTimeout(() => {
        filterMapByDisease("Simulated Biothreat");
    }, 1000);
}


// ════════════════════════════════════════════════════
//  CLINIC LOCATOR (Fallback on Map Tab)
// ════════════════════════════════════════════════════
function findNearestClinic() {
  playHaptic(30);
  const openMaps = (lat, lng) => {
    playHaptic([40, 40]);
    const query = encodeURIComponent('hospital OR clinic OR PHC');
    window.open(`https://www.google.com/maps/search/${query}/@${lat},${lng},14z`, '_blank');
  };
  if (userLocation.lat) { openMaps(userLocation.lat, userLocation.lng); return; }
  
  if (!navigator.geolocation) { showToast('GPS not supported','error'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => openMaps(pos.coords.latitude, pos.coords.longitude),
    () => showToast('Need location access to find hospitals','error'),
    { timeout:10000, enableHighAccuracy:true }
  );
}


// ════════════════════════════════════════════════════
//  PROFILE MODALS & SETTINGS
// ════════════════════════════════════════════════════
function loadProfiles() { 
  try {
    profiles = JSON.parse(localStorage.getItem('arog_prof') || '[]');
  } catch(e) {
    profiles = [];
  }
}
function saveProfilesStore() { 
  try {
    localStorage.setItem('arog_prof', JSON.stringify(profiles));
  } catch(e) {
    // localStorage blocked by tracking prevention
  }
}

function renderProfileHeader() {
  const p = getActiveProfile();
  $('profileAvatar').textContent = p ? p.emoji : '🧑';
  $('profileName').textContent   = p ? p.name : 'You';
}

function openProfileModal() {
  playHaptic(20);
  renderProfileListModal();
  $('profileModal').classList.add('show');
}

function renderProfileListModal() {
  const container = $('profileList');
  container.innerHTML = '';
  [{ id:'default', name:'You', emoji:'🧑', age:'', gender:'' }, ...profiles].forEach(p => {
    const div = document.createElement('div');
    div.className = 'prof-list-item';
    if(p.id === activeProfileId) div.style.borderColor = 'var(--blue-primary)';
    div.innerHTML = `
      <div style="font-size:28px;margin-right:16px;">${p.emoji}</div>
      <div style="flex:1;"><div style="font-weight:700;color:var(--text-dark)">${escHtml(p.name)}</div></div>
      <button class="text-btn text-blue" onclick="selectProf('${p.id}')">Select</button>
    `;
    container.appendChild(div);
  });
}

window.selectProf = (id) => {
  playHaptic(30); activeProfileId = id; renderProfileHeader();
  chatMessages = []; $('chatMessages').innerHTML = ''; sendGreeting();
  closeAllModals();
}

function addProfile() {
  playHaptic(20); editingEmoji = '🧑';
  $('editProfileId').value = ''; $('editProfileName').value = ''; $('editProfileAge').value = '';
  renderEmojiPicker(); $('editProfileModal').classList.add('show');
}

function renderEmojiPicker() {
  const container = $('emojiPicker');
  container.innerHTML = '';
  PROFILE_EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.className = `e-node ${em === editingEmoji ? 'selected' : ''}`;
    btn.textContent = em;
    btn.onclick = () => { playHaptic(10); editingEmoji = em; renderEmojiPicker(); };
    container.appendChild(btn);
  });
}

function saveProfile() {
  const name = $('editProfileName').value.trim();
  if (!name) return;
  const id = $('editProfileId').value || Date.now().toString();
  
  const existing = profiles.findIndex(p => p.id === id);
  if (existing >= 0) profiles[existing] = { id, name, age:$('editProfileAge').value, gender:$('editProfileGender').value, emoji: editingEmoji };
  else profiles.push({ id, name, age:$('editProfileAge').value, gender:$('editProfileGender').value, emoji: editingEmoji });

  saveProfilesStore(); closeAllModals(); openProfileModal(); playHaptic(40);
}

function loadApiKey() {
  try {
    const key = localStorage.getItem('gemini_api_key');
    if ($('apiKeyInput')) $('apiKeyInput').value = key || '';
  } catch(e) {
    // localStorage blocked by tracking prevention or incognito mode
    if ($('apiKeyInput')) $('apiKeyInput').value = '';
  }
}

function openSettings() { playHaptic(20); $('apiKeyInput').value = localStorage.getItem('gemini_api_key') || ''; $('settingsModal').classList.add('show'); }
function closeAllModals() { $$('.modal-backdrop').forEach(el => el.classList.remove('show')); }

function saveSettings() {
  const key = $('apiKeyInput').value.trim();
  if (!key) return;
  try {
    localStorage.setItem('gemini_api_key', key);
    showToast('AI Systems Online!','success');
  } catch(e) {
    showToast('Could not save API key (tracking prevention enabled)','error');
  }
  playHaptic([40, 40]); closeAllModals();
}

function showToast(msg, type='') {
  playHaptic(type==='error'?100:20);
  const toast = document.createElement('div');
  toast.className = `ui-toast ${type}`;
  toast.innerHTML = (type==='error'?'⚠️ ':'✓ ') + msg;
  $('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function escHtml(s) { return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Body Map Toggles
window.showBodySide = function(side) {
  playHaptic(20);
  $('bodySvgFront').classList.toggle('hidden', side !== 'front');
  $('bodySvgBack').classList.toggle('hidden', side !== 'back');
  $('btnFront').classList.toggle('active', side === 'front');
  $('btnBack').classList.toggle('active', side === 'back');
}
window.selectBodyPart = function(el) {
  playHaptic(25);
  const part = el.dataset.part;
  const label = el.dataset.en;
  if (el.classList.contains('selected')) {
    el.classList.remove('selected'); selectedBodyParts = selectedBodyParts.filter(p => p.part !== part);
  } else {
    el.classList.add('selected'); selectedBodyParts.push({ part, label });
  }
  renderSelectedParts();
}
window.renderSelectedParts = function() {
  const container = $('selectedParts'); container.innerHTML = '';
  selectedBodyParts.forEach(({ part, label }) => {
    container.innerHTML += `<div class="active-part"><span>${label}</span> <button onclick="removeBodyPart('${part}')">✕</button></div>`;
  });
  $('startChatFromBodyBtn').classList.toggle('hidden', selectedBodyParts.length === 0);
}
window.removeBodyPart = function(part) {
  playHaptic(15);
  selectedBodyParts = selectedBodyParts.filter(p => p.part !== part);
  $$('.bp').forEach(el => { if (el.dataset.part === part) el.classList.remove('selected'); });
  renderSelectedParts();
}
window.startChatFromBody = function() {
  if (!selectedBodyParts.length) return;
  const labels = selectedBodyParts.map(p => p.label).join(', ');
  $('chatInput').value = `I have pain in my ${labels}`;
  $('chatInput').dispatchEvent(new Event('input'));
  switchTab('chat');
  selectedBodyParts = []; $$('.bp').forEach(el => el.classList.remove('selected')); renderSelectedParts();
  setTimeout(sendMessage, 400);
}
