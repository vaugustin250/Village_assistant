# Arogyam — AI Village Health Assistant

An innovative, AI-powered Progressive Web Application (PWA) designed to provide comprehensive healthcare guidance to rural Indian communities with minimal technical expertise required.

![Arogyam](https://img.shields.io/badge/Status-Active-brightgreen)
![Python](https://img.shields.io/badge/Backend-FastAPI-009688)
![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Overview

Arogyam bridges the medical knowledge gap for users with low literacy levels by combining cutting-edge AI (Google Gemini) with a voice-driven, mobile-first interface. The philosophy is simple: **No typing required**.

### Core Innovations

#### 1. **Multi-Lingual Symptom Checker (Consult AI)**
- Voice-to-text support in English, Hindi, and Tamil
- AI-powered severity assessment (LOW, MEDIUM, HIGH)
- Automatic SOS alerts for critical conditions
- Text-to-speech responses for accessibility

#### 2. **Vision AI Medical Decoder (Lab AI)**
- Recognizes and translates medical reports from images
- Converts complex prescriptions into simple language
- Identifies medicines and suggests lifestyle changes
- Works with handwritten documents

#### 3. **Government Scheme Matcher (Finance AI)**
- Matches patients to applicable government health schemes
- Covers PM-JAY, CMCHIS, JSY, and other programs
- Provides eligibility information and required documents
- Personalized financial coverage estimates

#### 4. **Epidemic Outbreak Radar (Heatmap)**
- Real-time disease outbreak tracking
- Privacy-preserving location data
- Interactive map visualization
- Anonymous symptom logging

#### 5. **Interactive Body Scanner**
- Tap-to-select body part interface
- Visual SVG human body map (front and back)
- Instant symptom collection
- Intuitive for all age groups

## 🛠️ Technology Stack

### Backend
- **Framework:** FastAPI (Python)
- **Server:** Uvicorn
- **AI Models:** Google GenAI (Gemini 2.5, 2.0, 1.5 Flash)
- **API Communication:** Custom REST calls with model cascade fallback

### Frontend
- **Core:** HTML5, Vanilla JavaScript, CSS3
- **PWA:** Service Worker + Web Manifest
- **Mapping:** Leaflet.js + Leaflet-heat.js
- **APIs:** Web Speech API, SpeechSynthesis API
- **Design:** Glass-morphic UI, mobile-first approach

## 📋 Features

✅ **Voice Input/Output** - Fully voice-enabled interface  
✅ **Multi-Language Support** - English, Hindi, Tamil  
✅ **Medical Image Recognition** - AI-powered report analysis  
✅ **Progressive Web App** - Install to home screen  
✅ **Privacy First** - Anonymous data collection  
✅ **Offline Capable** - Service worker caching  
✅ **Low Bandwidth** - Optimized for 2G/3G networks  
✅ **Accessibility** - Screen reader friendly  

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip or pipenv
- Modern web browser with Web Speech API support

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/vaugustin250/Village_assistant.git
cd Village_assistant
```

2. **Set up Python environment**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure API Keys**
```bash
cp .env.example .env
# Edit .env and add your Google GenAI API key
```

5. **Start the backend server**
```bash
python main.py
# Server runs on http://localhost:8000
```

6. **Access the application**
- Open your browser to `http://localhost:8000`
- Or open `static/index.html` directly in the browser

## 📁 Project Structure

```
Village_assistant/
├── main.py                    # FastAPI backend application
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
├── static/
│   ├── index.html            # Main HTML interface
│   ├── app.js                # Frontend logic
│   ├── style.css             # Styling
│   ├── sw.js                 # Service worker
│   └── manifest.json         # PWA manifest
├── Project_Report.md         # Detailed project documentation
└── test_*.py                 # Test files
```

## 🔑 Environment Variables

Create a `.env` file based on `.env.example`:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
ENVIRONMENT=development
DEBUG=true
```

## 📱 Usage

### For Symptom Checking
1. Click "Consult AI" tab
2. Click the microphone icon or type your symptoms
3. AI analyzes and provides recommendations
4. For high-severity conditions, emergency contacts are displayed

### For Medical Report Analysis
1. Click "Lab AI" tab
2. Upload an image of your prescription/report
3. AI translates and explains the findings
4. Get medicine names and lifestyle recommendations

### For Government Schemes
1. Click "Finance AI" tab
2. Enter health condition and personal details
3. AI matches applicable government schemes
4. View eligibility and application requirements

### For Outbreak Tracking
1. Click "Heatmap" tab
2. View reported symptoms in your region
3. Stay informed about local disease patterns

## 🧪 Testing

Run the test files to validate functionality:

```bash
python comprehensive_test.py
python test_key.py
python test_scan.py
```

## 🔒 Privacy & Security

- **No Personal Data Storage:** User symptoms are anonymized
- **Location Privacy:** Coordinates are jittered for outbreak data
- **Encrypted Communication:** All API calls use HTTPS
- **Offline First:** Core functionality works without internet
- **GDPR Compliant:** No tracking or third-party analytics

## 🌍 Localization

Currently supports:
- **English** - Default interface
- **Hindi** - Voice input and responses
- **Tamil** - Voice input and responses

Easy to add more languages via the `lang` parameter in API calls.

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/symptom` | POST | Analyze symptoms |
| `/api/medical-decoder` | POST | Decode medical images |
| `/api/schemes` | POST | Find applicable schemes |
| `/api/outbreak` | GET/POST | Retrieve/log outbreak data |
| `/health` | GET | Server health check |

## 🐛 Known Limitations

- Requires active internet for AI model calls
- Medical diagnosis is advisory only, not diagnostic
- Voice API may have latency on slow networks
- Browser support limited to modern browsers with Web Speech API

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💼 Author

- **Augustin** - @vaugustin250
- Email: vaugustin250@gmail.com

## 🙏 Acknowledgments

- Google GenAI team for the Gemini models
- Leaflet.js community for mapping tools
- Indian Ministry of Health for scheme information
- Rural healthcare workers for inspiration

## ⚠️ Disclaimer

**Medical Advisory Disclaimer:**
Arogyam is an AI-powered information system designed to provide general health guidance and educational information. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for:

- Emergency situations (always call 108 in India)
- Serious symptoms
- Prescription medications
- Medical conditions requiring diagnosis

## 📞 Support & Contact

For issues, questions, or suggestions:
- GitHub Issues: [Create an issue](https://github.com/vaugustin250/Village_assistant/issues)
- Email: vaugustin250@gmail.com

## 🔗 Links

- [Project Report](Project_Report.md)
- [Google GenAI API](https://ai.google.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

**Made with ❤️ for Rural Healthcare**
