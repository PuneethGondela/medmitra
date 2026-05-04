from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import Local Engines
from tts_engine import TextToSpeech
from predictor import DiseasePredictor
import database

# --- Local AI Imports (Transformers) ---
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Data Models ---
class TranslationRequest(BaseModel):
    text: str
    target_language: str


class SpeakRequest(BaseModel):
    text: str


class PredictRequest(BaseModel):
    symptoms: dict


from typing import Optional, List, Dict


class ChatRequest(BaseModel):
    message: str
    worker_name: str = "Anonymous"
    occupation: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # New Field
    is_pregnant: bool = False
    due_date: Optional[str] = None
    mother_tongue: str = "English"  # Default
    history: list = []
    messages: Optional[List[Dict[str, str]]] = None  # Validation: Full history support


# --- Initialize Local Modules ---
print("Initializing Local AI Modules...")
tts = TextToSpeech()
predictor = DiseasePredictor()

# Initialize DB
database.init_db()

# --- Initialize Local Chat Model (High Accuracy, Fast) ---
# using Qwen2-1.5B-Instruct - Fits 100% in RTX 4050 VRAM (Fast)
LOCAL_MODEL_NAME = "Qwen/Qwen2-1.5B-Instruct"
local_model = None
local_tokenizer = None
model_loading_error = None

print("Attempting to load Local LLM...")
try:
    if torch.cuda.is_available():
        print(
            f"GPU Detected: {torch.cuda.get_device_name(0)}. Loading Qwen2-1.5B (GPU)..."
        )

        # Load directly with AutoModel (Standard FP16)
        local_tokenizer = AutoTokenizer.from_pretrained(
            LOCAL_MODEL_NAME, trust_remote_code=False
        )
        local_model = AutoModelForCausalLM.from_pretrained(
            LOCAL_MODEL_NAME,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=False,
        )
    else:
        print("No GPU detected. Loading Qwen2-1.5B on CPU (This might be slower)...")
        local_tokenizer = AutoTokenizer.from_pretrained(
            LOCAL_MODEL_NAME, trust_remote_code=False
        )
        local_model = AutoModelForCausalLM.from_pretrained(
            LOCAL_MODEL_NAME,
            device_map="cpu",
            torch_dtype=torch.float32,
            trust_remote_code=False,
        )

    print("Qwen2-1.5B Loaded Successfully!")
except Exception as e:
    model_loading_error = str(e)
    print(f"Failed to load local LLM: {e}")


# --- Endpoints ---


@app.get("/")
def read_root():
    gpu_status = "Available" if torch.cuda.is_available() else "Not Available"
    return {
        "status": "Med Mitra Local AI Server Running",
        "gpu": gpu_status,
        "models": {
            "tts": "pyttsx3 (Offline)",
            "prediction": "RandomForest (sklearn)",
            "chat": (
                LOCAL_MODEL_NAME
                if local_model
                else f"Gemini (Fallback) - Local Load Error: {model_loading_error}"
            ),
        },
    }


@app.post("/speak")
def speak_text(request: SpeakRequest):
    try:
        success = tts.speak(request.text)
        return {
            "status": "success" if success else "failed",
            "message": f"Spoke: {request.text}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
def predict_disease(request: PredictRequest):
    result = predictor.predict(request.symptoms)
    return {"prediction": result}


@app.post("/chat")
def chat_bot(request: ChatRequest):
    global model_loading_error
    local_error_msg = model_loading_error or "Not processed"

    user_msg = request.message
    worker_lang = request.mother_tongue or "English"

    # --- Database Integration (Sync) ---
    try:
        worker_id = database.get_or_create_worker(
            request.worker_name,
            request.occupation,
            request.age,
            request.is_pregnant,
            request.due_date,
            request.mother_tongue,
            request.gender,
        )
        database.save_chat_message(worker_id, "user", user_msg)
    except Exception:
        worker_id = 0

    # --- 1. Bidirectional Local AI Pipeline ---
    if local_model and local_tokenizer:
        try:
            # A. INPUT TRANSLATION (Native -> English)
            english_input = None
            if worker_lang.strip().lower() != "english":
                print(f"🔄 Translating Input ({worker_lang} -> English)...")
                english_input = perform_translation(user_msg, "English", worker_lang)

                if english_input:
                    print(f"✅ Input Translated: '{user_msg}' -> '{english_input}'")
                    user_msg = english_input
                else:
                    print(
                        f"❌ Input Translation FAILED. Raw text '{user_msg}' would cause hallucinations."
                    )
                    # FALLBACK: Do not send raw Telugu to Qwen.
                    # Send a prompt telling Qwen to ask for English.
                    user_msg = "The user spoke in a language I could not translate. Please politely ask them to speak in English."
                    # Also set a flag to avoid translating the output logic blindly
                    worker_lang = "English"  # Force output to be English since we failed to parse input

            # Logic Prompt (English)
            if request.messages:
                # Use provided messages (includes Backend Context)
                messages = request.messages
            else:
                # Fallback: Construct default
                messages = [
                    {
                        "role": "system",
                        "content": "You are Med Mitra. Analyze symptoms and provide safe medical advice in simple English.",
                    },
                    {"role": "user", "content": user_msg},
                ]

            prompt = local_tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = local_tokenizer(prompt, return_tensors="pt").to(local_model.device)

            outputs = local_model.generate(
                **inputs, max_new_tokens=400, temperature=0.7, do_sample=True
            )
            response_text = local_tokenizer.decode(
                outputs[0][inputs.input_ids.shape[1] :], skip_special_tokens=True
            ).strip()

            final_response = response_text
            model_info = "Local GPU + Local NLLB"

            # B. OUTPUT TRANSLATION (English -> Native)
            if worker_lang.strip().lower() != "english":
                print(f"Translating Output (English -> {worker_lang})...")
                translated = perform_translation(response_text, worker_lang, "English")
                if translated:
                    final_response = translated
                else:
                    final_response += "\n(Translation Failed)"

            # Save and Return
            database.save_chat_message(worker_id, "assistant", final_response)
            return {"response": final_response, "model": model_info}

        except Exception as e:
            print(f"Pipeline Error: {e}")
            local_error_msg = str(e)

    # Fallback to Gemini...

    # --- 2. Fallback to Gemini ---
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash-exp")

            # Inject System Prompt logic for Gemini too if needed
            system_instruction = (
                "You are Med Mitra. Focus on Worker Safety and Ancient Remedies."
            )
            if request.is_pregnant:
                system_instruction += " Worker is PREGNANT. create Safe Motherhood Plan, Doctor Visits, Alerts."

            model = genai.GenerativeModel(
                "gemini-2.0-flash-exp", system_instruction=system_instruction
            )
            chat = model.start_chat(history=[])
            response = chat.send_message(user_msg)

            # Save Gemini Response
            database.save_chat_message(worker_id, "assistant", response.text)

            return {"response": response.text, "model": "Gemini (Cloud)"}
        except Exception as e:
            return {
                "response": f"System Error. Gemini: {str(e)} | Local Model: {local_error_msg}",
                "model": "Error",
            }

    return {
        "response": f"Local model unavailable ({local_error_msg}) and no API key found.",
        "model": "None",
    }


# --- Initialize Local Translation Model (CPU) ---
TRANSLATION_MODEL_NAME = "facebook/nllb-200-distilled-600M"
translation_tokenizer = None
translation_model = None

try:
    print(f"Loading Translation Model ({TRANSLATION_MODEL_NAME}) on CPU...")
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

    translation_tokenizer = AutoTokenizer.from_pretrained(
        TRANSLATION_MODEL_NAME, use_safetensors=True
    )
    translation_model = AutoModelForSeq2SeqLM.from_pretrained(
        TRANSLATION_MODEL_NAME, use_safetensors=True
    )
    print("✅ Translation Model Loaded!")
except Exception as e:
    print(f"⚠️ Translation Model Load Failed: {e}")
    # Fallback to bin if safetensors missing (will likely fail again due to torch policy, but worth try)
    try:
        if "safetensors" in str(e):
            print(
                "Retrying with use_safetensors=False (May fail due to Torch Security)..."
            )
            translation_model = AutoModelForSeq2SeqLM.from_pretrained(
                TRANSLATION_MODEL_NAME, use_safetensors=False
            )
    except:
        pass


def perform_translation(
    text: str, target_language_name: str, source_language_name: str = "English"
):
    if not translation_model or not translation_tokenizer:
        print("⚠️ Translation Model not loaded.")
        return None

    # NLLB Codes
    lang_map = {
        "telugu": "tel_Telu",
        "tamil": "tam_Taml",
        "hindi": "hin_Deva",
        "kannada": "kan_Knda",
        "malayalam": "mal_Mlym",
        "marathi": "mar_Deva",
        "spanish": "spa_Latn",
        "french": "fra_Latn",
        "english": "eng_Latn",
    }

    tgt_code = lang_map.get(target_language_name.strip().lower())
    if not tgt_code:
        if target_language_name.lower() == "english":
            tgt_code = "eng_Latn"
        else:
            print(f"⚠️ Target Lang '{target_language_name}' not found in map.")
            return None

    src_code = lang_map.get(source_language_name.strip().lower(), "eng_Latn")

    print(
        f"🌍 Translating: '{text[:20]}...' | {source_language_name}({src_code}) -> {target_language_name}({tgt_code})"
    )

    try:
        # Tokenize
        translation_tokenizer.src_lang = src_code
        inputs = translation_tokenizer(text, return_tensors="pt")

        translated_tokens = translation_model.generate(
            **inputs,
            forced_bos_token_id=translation_tokenizer.convert_tokens_to_ids(tgt_code),
            max_length=512,
        )

        result = translation_tokenizer.batch_decode(
            translated_tokens, skip_special_tokens=True
        )[0]
        # print(f"   -> Result: {result[:20]}...")
        return result
    except Exception as e:
        print(f"❌ NLLB Inference Error: {e}")
        return None


@app.post("/translate")
def translate_text(request: TranslationRequest):
    result = perform_translation(request.text, request.target_language)
    if result:
        return {"translated_text": result, "target_language": request.target_language}
    return {"error": "Local translation unavailable."}


from fastapi import File, UploadFile
import io
from PIL import Image


@app.post("/analyze_image")
async def analyze_image(file: UploadFile = File(...)):
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "No API Key for Vision"}

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = "Analyze this medical image (Scan/X-Ray/Skin). Describe findings clearly for a doctor."
        response = model.generate_content([prompt, image])

        return {"analysis": response.text}
    except Exception as e:
        return {"error": str(e)}


# --- Compatibility Models (Med Mitra App Support) ---
from typing import List, Dict, Any


class StandardChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    max_tokens: int = 512
    temperature: float = 0.7
    role: Optional[str] = "user"


class StandardTTSRequest(BaseModel):
    text: str
    language: str = "en"


class StandardTranslationRequest(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str


class AdminAnalysisRequest(BaseModel):
    query: str
    context_data: Dict[str, Any]
    max_tokens: int = 512


# --- Compatibility Endpoints ---


@app.post("/api/chat")
def api_chat_bot(request: StandardChatRequest):
    # Adapter: Extract last user message and call logic
    last_msg = next(
        (m["content"] for m in reversed(request.messages) if m["role"] == "user"), ""
    )

    # Create internal request with defaults
    internal_req = ChatRequest(
        message=last_msg,
        worker_name="AppUser",
        temperature=request.temperature,
        messages=request.messages,  # Pass full history with context
    )

    # We can reuse chat_bot logic or call Qwen directly.
    # Reusing chat_bot ensures DB logging and translation features are used.
    # However, chat_bot return format is specific. App expects {"response": "..."}

    response_data = chat_bot(internal_req)
    if isinstance(response_data, dict):
        return {
            "response": response_data.get("response", ""),
            "model": response_data.get("model", ""),
        }
    return response_data


@app.post("/api/tts")
def api_speak_text(request: StandardTTSRequest):
    # Adapter
    return speak_text(SpeakRequest(text=request.text))


@app.post("/api/translate")
def api_translate_text(request: StandardTranslationRequest):
    # Adapter
    result = perform_translation(request.text, request.tgt_lang, request.src_lang)
    if result:
        return {"translated_text": result}
    return {"error": "Local translation unavailable."}


@app.post("/api/admin/analyze")
async def api_admin_analyze(request: AdminAnalysisRequest):
    # Admin Logic Adapter using Local Qwen
    if not local_model or not local_tokenizer:
        return {"response": "Local Admin Model Unavailable (No GPU/CPU Model loaded)."}

    system_prompt = (
        "You are Mitr AI, a security and administrative assistant. "
        "Analyze the provided JSON system context and answer the query. "
        "Focus on security anomalies (failed logins, unusual activity)."
    )

    user_prompt = f"Context: {str(request.context_data)}\n\nQuery: {request.query}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        prompt = local_tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = local_tokenizer(prompt, return_tensors="pt").to(local_model.device)

        outputs = local_model.generate(
            **inputs,
            max_new_tokens=request.max_tokens or 400,
            temperature=0.5,
            do_sample=True,
        )
        response_text = local_tokenizer.decode(
            outputs[0][inputs.input_ids.shape[1] :], skip_special_tokens=True
        ).strip()

        return {"response": response_text}
    except Exception as e:
        print(f"Admin Analyze Error: {e}")
        return {"response": f"Error during analysis: {str(e)}"}


if __name__ == "__main__":
    import uvicorn

    # Listen on all interfaces
    uvicorn.run(app, host="0.0.0.0", port=8000)
