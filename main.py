import json
import re
import urllib.request
import urllib.error
import random
import time
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import chromadb

load_dotenv()

app = FastAPI(title="AI Village Health Assistant — Arogyam")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def kill_cache(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Clear-Site-Data"] = '"cache"'
    return response

app.mount("/static", StaticFiles(directory="static"), name="static")

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]
GEMINI_VISION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]  # Vision-capable models (1.5-flash does NOT support vision)
SERVER_API_KEY = os.environ.get("GEMINI_API_KEY", "")

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini").lower()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODELS_TO_TRY = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
GROQ_VISION_MODELS_TO_TRY = ["llama-3.2-90b-vision-preview"]  # Updated: removed deprecated 11b-vision-preview

# ─── DATA SOURCES ────────────────────────────────────────────────────────────

HEATMAP_DATA = [
    {"lat": 13.0827, "lng": 80.2707, "weight": 80, "disease": "Dengue"}, # Chennai base
    {"lat": 13.1000, "lng": 80.2500, "weight": 100, "disease": "Viral Fever"},
    {"lat": 28.7041, "lng": 77.1025, "weight": 60, "disease": "Flu"}, # Delhi base
    {"lat": 19.0760, "lng": 72.8777, "weight": 90, "disease": "Malaria"}, # Mumbai base
    {"lat": 10.7905, "lng": 78.7047, "weight": 70, "disease": "Typhoid"}, # Trichy base
]

INDIAN_HEALTH_SCHEMES = [
    {
        "name": "Ayushman Bharat PM-JAY",
        "description": "Up to 5 Lakhs free treatment per family per year for secondary and tertiary care hospitalizations.",
        "eligibility": "BPL families, SC/ST, landless laborers, vulnerable rural populations.",
        "docs_required": ["Aadhaar Card", "Ration Card", "PMJAY Golden Card"]
    },
    {
        "name": "Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS)",
        "description": "Tamil Nadu specific scheme providing up to 5 Lakhs per family for life-threatening illnesses and surgeries.",
        "eligibility": "Residents of Tamil Nadu with family annual income less than Rs. 1,20,000.",
        "docs_required": ["TN Smart Ration Card", "Income Certificate (VAO)", "Aadhaar Card"]
    },
    {
        "name": "Janani Suraksha Yojana (JSY)",
        "description": "Direct cash assistance to pregnant women to encourage institutional delivery and reduce maternal mortality.",
        "eligibility": "BPL pregnant women aged 19 and above.",
        "docs_required": ["Aadhaar", "Bank passbook", "Pregnancy Registration Card (MCP Card)"]
    },
    {
        "name": "Rashtriya Arogya Nidhi (RAN)",
        "description": "One-time financial assistance to BPL patients suffering from major life-threatening diseases (Cancer, Heart, Kidney) for treatment at govt super-specialty hospitals.",
        "eligibility": "BPL patients requiring highly specialized treatment.",
        "docs_required": ["BPL Ration card", "Treatment Estimate from Govt Hospital Doctor", "Income Certificate"]
    }
]

# ─── Initialization of True RAG Vector DB ─────────────────────────────────────
schemes_collection = None
try:
    chroma_client = chromadb.EphemeralClient()
    schemes_collection = chroma_client.get_or_create_collection(name="health_schemes")
    
    if schemes_collection.count() == 0:
        documents = [f"{s['name']} - {s['description']} - Eligibility: {s['eligibility']}" for s in INDIAN_HEALTH_SCHEMES]
        ids = [s["name"] for s in INDIAN_HEALTH_SCHEMES]
        metadatas = [{"json": json.dumps(s)} for s in INDIAN_HEALTH_SCHEMES]
        schemes_collection.add(documents=documents, metadatas=metadatas, ids=ids)
    print(f"RAG Vector DB Initialized with {schemes_collection.count()} schemes.")
except Exception as e:
    print("Failed to initialize ChromaDB:", e)

# ─── System Prompts ────────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are Arogyam, an expert doctor with immensely high medical knowledge, but you communicate exceptionally simply.
Your goal is to talk to the user like a warm, experienced, and very friendly human doctor sitting right across from them in a clinic.
Everything you say must be extremely easy to understand for someone with zero medical knowledge. Use simple, everyday analogies to explain complex medical concepts.
Respond in the EXACT language the user speaks. Do NOT use intimidating medical terms.

Return ONLY valid JSON in this exact structure:
{
  "type":"advice",
  "message":"A highly comforting, conversational opening. Speak directly to the patient ('You'), acknowledge their symptoms gently, and reassure them warmly.",
  "what_it_might_be":"Explain exactly what is happening in their body using extremely easy, everyday analogies (e.g., 'think of your arteries like water pipes...'). Show your high knowledge but keep it incredibly simple.",
  "home_remedies":["Practical, easy-to-do home remedy 1 explained clearly", "Practical remedy 2"],
  "see_doctor":"A friendly, direct recommendation on when to see an actual doctor, or if it's an emergency, exactly what to do next without inducing panic.",
  "severity":"LOW" (LOW | MEDIUM | HIGH)
}"""

SCAN_SYSTEM_PROMPT = """You are a highly skilled Rural Medical Assistant.
Analyze the attached photo of a medical lab report or doctor's prescription in MAXIMUM DETAIL.
Translate the complex medical jargon into a VERY detailed but simple 5th-grade explanation.
Extract EVERY single data point, test result out of normal range, and medicine mentioned.
Provide a comprehensive, lengthy analysis. Do not summarize briefly; the user wants a BIG, detailed report.
ABSOLUTELY NO EXTRA TEXT. Return JUST the JSON block starting with { and ending with } without markdown.

Return ONLY valid JSON:
{
  "document_type": "Detailed classification of the document",
  "summary": "A highly detailed, multi-paragraph explanation of the overall health status shown in the document. Be very thorough.",
  "findings": [
    "List every single test result, what it means, and whether it's normal or abnormal in great detail.",
    "Include specific numbers from the report and explain them.",
    "Do not miss any detail from the image."
  ],
  "medicines_found": [
    "Medicine Name 1 - What it is for, dosage, and simple instructions",
    "Medicine Name 2 - What it is for, dosage, and simple instructions"
  ],
  "lifestyle_changes": [
    "Specific diet recommendation based on the report",
    "Specific activities to avoid or do"
  ],
  "advice": "A thorough, step-by-step action plan for the patient."
}"""

SCHEME_SYSTEM_PROMPT = """You are a rural Indian Financial Health Advisor.
Listen to the patient's demographics and their medical problem.
Find the BEST MATCHING Free Government Scheme for them from the officially retrieved database provided in the context below.

Retrieved Database Constraints:
{context}

Return ONLY valid JSON:
{
  "matched_scheme": "Name of the scheme",
  "why_it_fits": "Why they qualify based on what they told you",
  "what_it_gives": "What financial help they will get",
  "documents_needed": ["Doc 1", "Doc 2"]
}"""


# ─── Gemini REST Helper ────────────────────────────────────────────────────────

def call_gemini(api_key: str, model: str, contents: list) -> str:
    url = f"{GEMINI_API_BASE}/{model}:generateContent?key={api_key}"
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 4096},
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=40) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    # Check for empty or blocked responses
    if "candidates" not in result or not result["candidates"]:
        raise Exception("Safety blocked or empty response")
    
    return result["candidates"][0]["content"]["parts"][0]["text"]


def call_groq(api_key: str, model: str, contents: list) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    messages = []
    for msg in contents:
        role = msg.get("role", "user")
        if role == "model":
            role = "assistant"
        
        content = []
        has_local_image = False
        for part in msg.get("parts", []):
            if "text" in part:
                content.append({"type": "text", "text": part["text"]})
            elif "inlineData" in part:
                mime = part["inlineData"]["mimeType"]
                data = part["inlineData"]["data"]
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{data}"}
                })
                has_local_image = True
        
        if not has_local_image and len(content) == 1 and content[0]["type"] == "text":
            messages.append({"role": role, "content": content[0]["text"]})
        else:
            messages.append({"role": role, "content": content})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 4096,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, 
        data=body, 
        headers={
            "Content-Type": "application/json", 
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Arogyam/1.0"
        }, 
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=40) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    if "choices" not in result or not result["choices"]:
        raise Exception("Safety blocked or empty response from Groq")
        
    return result["choices"][0]["message"]["content"]


def try_models(user_api_key: str, contents: list) -> str:
    has_image = any("inlineData" in part for msg in contents for part in msg.get("parts", []))
    
    # For vision requests, ALWAYS use Gemini with vision-capable models
    if has_image:
        provider = "gemini"
        actual_key = user_api_key or SERVER_API_KEY
        models_list = GEMINI_VISION_MODELS  # Use vision-specific models
        call_fn = call_gemini
    else:
        # For text-only requests, use the configured provider
        provider = LLM_PROVIDER
        if user_api_key:
            if user_api_key.startswith("gsk_"):
                provider = "groq"
            else:
                provider = "gemini"
        
        if provider == "groq":
            actual_key = user_api_key or GROQ_API_KEY
            models_list = GROQ_MODELS_TO_TRY
            call_fn = call_groq
        else:
            actual_key = user_api_key or SERVER_API_KEY
            models_list = MODELS_TO_TRY
            call_fn = call_gemini

    if not actual_key:
        raise HTTPException(status_code=401, detail="API key is not configured or provided.")

    last_err_code = 500
    last_err_detail = "All models failed"
    for model in models_list:
        try:
            return call_fn(actual_key, model, contents)
        except urllib.error.HTTPError as e:
            last_err_code = e.code
            try:
                body = e.read().decode("utf-8", errors="replace")
                last_err_detail = json.loads(body).get("error", {}).get("message", body)
            except Exception:
                last_err_detail = str(e)
            continue
        except Exception as e:
            last_err_detail = str(e)
            continue
    raise HTTPException(status_code=last_err_code, detail=last_err_detail)


def parse_json(raw: str) -> dict:
    raw = raw.strip()
    
    # Try direct JSON parsing first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    
    # Try extracting JSON from curly braces
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1:
        json_str = raw[start:end+1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
    
    # Try removing markdown code fences
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    
    # Try parsing again after fence removal
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass
    
    # Last resort: extract JSON between braces again after fence removal
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(raw[start:end+1])
        except json.JSONDecodeError:
            pass
    
    # If all parsing fails, raise a detailed error
    raise json.JSONDecodeError(f"Cannot parse response as JSON. Raw response (first 200 chars): {raw[:200]}", raw, 0)


# ─── Request Models ────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    language: str = "English"
    api_key: str = ""
    profile: Optional[dict] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class MedicineRequest(BaseModel):
    medicine: str
    language: str = "English"
    api_key: str = ""

class ScanRequest(BaseModel):
    image_data: str   # base64 string
    mime_type: str
    language: str = "English"
    api_key: str = ""

class SchemeRequest(BaseModel):
    query: str
    demographics: dict
    language: str = "English"
    api_key: str = ""

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return FileResponse("static/index.html")

@app.get("/api/heatmap")
async def get_heatmap():
    return {"success": True, "result": HEATMAP_DATA}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    key = req.api_key.strip() or SERVER_API_KEY
    if not key:
        raise HTTPException(status_code=401, detail="API key required")

    profile_ctx = ""
    if req.profile:
        profile_ctx = f"\nPatient: {req.profile.get('name','')}, Age {req.profile.get('age','?')}, {req.profile.get('gender','')}"

    system = CHAT_SYSTEM_PROMPT + profile_ctx + f"\nRespond in: {req.language}"

    contents = []
    for i, msg in enumerate(req.messages):
        role = "user" if msg.role == "user" else "model"
        text = (system + "\n\n" + msg.content) if i == 0 else msg.content
        contents.append({"role": role, "parts": [{"text": text}]})

    raw = try_models(req.api_key.strip(), contents)

    try:
        data = parse_json(raw)
        if data.get("type") == "advice":
            sev = data.get("severity", "MEDIUM")
            if sev not in ["LOW", "MEDIUM", "HIGH"]:
                data["severity"] = "MEDIUM"
                sev = "MEDIUM"

            # INNOVATION 3: Live Epidemic Outbreak Heatmap Logging
            # If disease is severe, plot it anonymously!
            if sev in ["MEDIUM", "HIGH"] and req.lat and req.lng:
                # Add some slight jitter to protect exact location privacy
                j_lat = req.lat + random.uniform(-0.02, 0.02)
                j_lng = req.lng + random.uniform(-0.02, 0.02)
                HEATMAP_DATA.append({"lat": j_lat, "lng": j_lng, "weight": 100, "disease": data.get("what_it_might_be", "Unknown")})
                
        return JSONResponse(content={"success": True, "result": data})
    except Exception:
        return JSONResponse(content={"success": True, "result": {"type": "question", "message": raw}})


@app.post("/api/scan_document")
async def scan_document(req: ScanRequest):
    """INNOVATION 1: Vision AI Medical Report/Prescription Decoder"""
    key = req.api_key.strip() or SERVER_API_KEY
    if not key:
        raise HTTPException(status_code=401, detail="API key required")
    if not req.image_data:
        raise HTTPException(status_code=400, detail="Image required")
    if not req.mime_type:
        raise HTTPException(status_code=400, detail="Image MIME type required (e.g., image/jpeg)")

    prompt = f"{SCAN_SYSTEM_PROMPT}\n\nCRITICAL INSTRUCTION: Analyze the document and write ALL values in the output JSON exclusively in {req.language.upper()} language. Even if the text in the image is English, you MUST translate the summary, findings, medicines, and advice into {req.language.upper()}."
    contents = [{
        "role": "user",
        "parts": [
            {"text": prompt},
            {"inlineData": {"mimeType": req.mime_type, "data": req.image_data}}
        ]
    }]

    try:
        raw = try_models(req.api_key.strip(), contents)
    except HTTPException as he:
        # Re-raise HTTP exceptions as-is
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision AI Error: {str(e)}")
    
    try:
        data = parse_json(raw)
        return {"success": True, "result": data}
    except Exception as e:
        # If JSON parsing fails but we got a response, return it as a text response
        return {"success": True, "result": {"document_type": "Analysis Result", "summary": raw, "findings": [], "medicines_found": [], "lifestyle_changes": [], "advice": "Unable to parse structured response."}}


@app.post("/api/match_scheme")
async def match_scheme(req: SchemeRequest):
    """INNOVATION 2: Government Health Scheme RAG Matcher"""
    demo = req.demographics
    patient_info = f"Disease: {req.query}. Age: {demo.get('age')}\nGender: {demo.get('gender')}\nIncome/Caste Context: {demo.get('financial_status', 'Unknown')}\n"
    
    # 1. RETRIEVE from RAG Vector DB
    matched_context = "No schemes matching found. Inform the patient."
    if schemes_collection:
        try:
            results = schemes_collection.query(
                query_texts=[patient_info],
                n_results=2
            )
            if results["metadatas"] and len(results["metadatas"]) > 0 and len(results["metadatas"][0]) > 0:
                retrieved_schemes = [json.loads(meta["json"]) for meta in results["metadatas"][0]]
                matched_context = json.dumps(retrieved_schemes)
        except Exception as e:
            print("RAG Query Failed:", e)
            matched_context = json.dumps(INDIAN_HEALTH_SCHEMES)
    else:
        matched_context = json.dumps(INDIAN_HEALTH_SCHEMES)
        
    # 2. GENERATE with retrieved context
    prompt = SCHEME_SYSTEM_PROMPT.replace("{context}", matched_context) + f"\n\nPatient Profile:\n{patient_info}\nPatient Query: {req.query}\nCRITICAL INSTRUCTION: Output ALL JSON values fully translated into {req.language.upper()} language."
    
    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    raw = try_models(req.api_key.strip(), contents)
    
    try:
        data = parse_json(raw)
        return {"success": True, "result": data}
    except Exception as e:
        return {"success": False, "detail": str(e), "raw": raw}


@app.post("/api/medicine")
async def medicine_info(req: MedicineRequest):
    key = req.api_key.strip() or SERVER_API_KEY
    prompt = f"Explain medicine {req.medicine} in simple 5th-grade {req.language}. JSON format: {{\"name\":\"\",\"used_for\":\"\",\"how_to_take\":\"\",\"side_effects\":[]}}"
    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    raw = try_models(key, contents)
    try:
        return {"success": True, "result": parse_json(raw)}
    except:
        return {"success": True, "result": {"name": req.medicine, "used_for": raw, "how_to_take":"", "side_effects":[]}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
