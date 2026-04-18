# Project Report: Arogyam — AI Village Health Assistant

## 1. Project Overview & Abstract
**Arogyam** is an innovative, AI-powered progressive web application (PWA) designed specifically to cater to rural Indian communities. It serves as a comprehensive, localized healthcare advisor. By combining cutting-edge Generative AI models (such as Google Gemini) with an extremely simplified, voice-driven, mobile-first interface, it bridges the medical knowledge gap for users who may have low literacy levels or minimal technical expertise.

The core objective of the project is to provide a unified platform capable of diagnosing symptoms safely, translating complex medical reports into simple regional languages, recommending relevant financial health schemes, and monitoring local disease outbreaks—all while strictly adhering to a "No typing required" philosophy.

---

## 2. Core Features & "Triple Innovations"

### 2.1. Multi-Lingual Symptom Checker (Consult / Chat AI)
- **Voice-to-Text Integration:** Users can speak their symptoms directly into the app using their device's microphone in languages like English, Hindi, and Tamil. The browser's Web Speech API captures this and forwards it to the backend.
- **Severity & SOS Mapping:** The AI categorizes the severity of the symptoms as *LOW, MEDIUM, or HIGH*. If 'HIGH' severity is detected, the frontend immediately triggers an actionable "SOS Bar", prompting the user to call emergency services (108).
- **Text-to-Speech:** AI responses are read aloud using the browser's `SpeechSynthesis` API, making it fully accessible to the visually impaired or non-readers.

### 2.2. Vision AI Medical Decoder (Phase 1 Innovation - Lab AI)
- **Problem Statement:** Rural patients often receive handwritten prescriptions or complex blood-test reports they cannot read.
- **Solution:** Users take a picture of the document via the "Lab AI" tab. The backend forwards the base64-encoded image to Google's Gemini Vision models.
- **Output:** The AI returns a simple, 5th-grade level translation of the report in the user's native language, meticulously listing normal/abnormal findings, identified medicines, and suggested diet/lifestyle changes.

### 2.3. Government Scheme RAG Matcher (Phase 2 Innovation - Finance AI)
- **Problem Statement:** Patients are often unaware of free surgical or medical schemes provided by the government.
- **Solution:** A specialized AI prompt architecture that takes the user's illness, age, gender, and financial status (e.g., Below Poverty Line or Farmer) and intelligently matches it against a predefined database of Indian Health Schemes (like *PM-JAY*, *CMCHIS*, *JSY*).
- **Output:** Tells the user exactly why they qualify, what financial coverage they get, and the exact physical documents needed to apply.

### 2.4. Epidemic Outbreak Radar (Phase 3 Innovation - Heatmap)
- **Live Local Tracking:** Uses `Leaflet.js` to plot a visual map of symptoms being reported by users locally.
- **Privacy-Preserving Data:** When the chatbot processes a HIGH/MEDIUM severity disease query, it securely and anonymously logs it to the backend array. It automatically applies a slight geographical jitter to the coordinates to heavily protect exact user location privacy.

### 2.5. Interactive Visual Body Scanner (Pain UI)
- The app features a beautifully designed, tappable SVG map of the human body (Front and Back). Users tap the exact body part that hurts, and the UI dynamically converts those selections into a prompt (e.g., "I have pain in my Left Shoulder and Upper Back") and routes it straight into the AI Chat.

---

## 3. Technology Stack & Architecture

### Backend Ecosystem
- **Framework:** **FastAPI** (Python) running on a local **Uvicorn** server. Chosen for its lightweight speed and seamless JSON API capability.
- **AI Processing:** Google GenAI Models (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`). 
- **Restful LLM Fallback Integration:** Rather than relying on rigid, heavy SDKs, the backend utilizes custom `urllib.request` REST calls. This handles a native model cascade effect—if one model is rate-limited or fails, it intelligently drops down to the next available model transparently.
- **Datastore Approach:** Scheme lists and Heatmap data are kept lightweight in standard Python data structures to ensure speed and zero-configuration setups for MVP testing. 

### Frontend Ecosystem
- **Core Building Blocks:** Pure HTML5, Vanilla JavaScript (`app.js`), and Vanilla Custom Property CSS (`style.css`). By avoiding heavy frameworks like React, the app guarantees lightning-fast load times even on spotty 2G/3G regional networks.
- **Mobile First / PWA Design:** Configured with a `manifest.json` and a Service Worker (`sw.js`). Users can "Install" the web app directly to their mobile home screens for a native-app feel.
- **Geospatial Tools:** Integrates `Leaflet.js` and `leaflet-heat.js` for lightweight canvas map rendering.
- **Design System Aesthetic:** Employs sleek, modern glass-morphic elements, soft pastel themes, and clear oversized buttons specially designed for older demographics.

---

## 4. System Logic & Workflow Diagram
1. **Initiation:** The App is loaded. The user sets their preferred profile and language (e.g., Hindi). 
2. **Audio Input:** The user taps the microphone button and states their medical issue. `SpeechRecognition` transcripts the regional audio into text.
3. **API Routing:** `app.js` dispatches an HTTP POST request to `http://localhost:8000/api/chat`.
4. **Backend Processing & System Prompts:**
   - FastAPI intercepts the request.
   - The backend structures the payload alongside a highly engineered `CHAT_SYSTEM_PROMPT` emphasizing rural contexts and strict JSON responses.
5. **Sanitization Matrix:** A built-in regex parser strips out rogue markdown and ensures pure JSON objects are extracted flawlessly from the LLM.
6. **Delivery & UI Rendering:** Output JSON is pushed to `app.js`, appending the chat bubble, evaluating the severity tag for potential SOS logic triggers, and finally starting `window.speechSynthesis` to vocalize the advice back to the user.

---

## 5. Summary & Conclusion
The **Arogyam** project is a perfect intersection of human-centric frontend accessibility and robust backend AI orchestration. It strips away the intimidating complexities, reading requirements, and typing requirements of modern health-tech, rendering an approachable and potentially life-saving utility directly into the hands of under-served communities.
