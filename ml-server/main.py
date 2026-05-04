import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Import modules - Assuming they are in the same directory
from tts_engine import TTSEngine
from translation import Translator

# Global instances
tts_engine = TTSEngine()
translator = Translator()

# Global Model Variables
model = None
tokenizer = None

class ChatRequest(BaseModel):
    messages: List[dict]
    max_tokens: int = 512
    temperature: float = 0.7

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    global model, tokenizer
    print("Loading Model on Startup...")
    
    base_model_name = "Qwen/Qwen2-1.5B-Instruct" 
    adapter_path = "adapters" # Relative path to adapters directory

    try:
        # Load Base Model
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16
        )
        tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
        
        # Load Adapter if available
        if os.path.exists(os.path.join(adapter_path, "adapter_model.bin")) or os.path.exists(os.path.join(adapter_path, "adapter_config.json")):
            try:
                model = PeftModel.from_pretrained(base_model, adapter_path)
                print("LoRA Adapter Loaded.")
            except Exception as e:
                print(f"Warning: Adapter load failed ({e}). Using base model.")
                model = base_model
        else:
            print("No adapter found. Using base model.")
            model = base_model
            
        # Fix for pad_token_id warning
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            model.config.pad_token_id = tokenizer.eos_token_id
            
        print("Model Loaded Successfully.")
        yield
        
    except Exception as e:
        print(f"CRITICAL: Failed to load model: {e}")
        # We don't raise here to allow the server to start even if model fails (though /chat will fail)
        yield
    finally:
        # Cleanup if needed
        pass

app = FastAPI(title="Med Mitra ML Server", lifespan=lifespan)

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    global model, tokenizer
    
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded or failed to initialize.")

    try:
        # System Prompt Injection for Ancient Wisdom
        system_prompt = {
            "role": "system", 
            "content": (
                "You are Med Mitra, a wise and empathetic medical assistant. "
                "Your goal is to provide safe, professional medical guidance while also suggesting relevant ancient cure techniques (Ayurveda, Home Remedies) where appropriate. "
                "Always advise consulting a doctor for serious conditions. "
                "Format your response clearly. "
                "Structure: 1. Medical Assessment 2. Modern Advice 3. Ancient/Natural Remedy (if applicable)."
            )
        }
        
        # Prepend system prompt if not present
        messages = request.messages
        if messages[0]["role"] != "system":
            messages.insert(0, system_prompt)

        # Generate
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        generated_ids = model.generate(
            inputs.input_ids,
            attention_mask=inputs.attention_mask,
            pad_token_id=tokenizer.eos_token_id,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            do_sample=True
        )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(inputs.input_ids, generated_ids)
        ]
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return {"response": response}

    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class AdminAnalysisRequest(BaseModel):
    query: str
    context_data: dict  # structured data (logs, stats)
    max_tokens: int = 512

@app.post("/api/admin/analyze")
async def admin_analyze_endpoint(request: AdminAnalysisRequest):
    global model, tokenizer
    
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded or failed to initialize.")

    try:
        # System Prompt for Admin Persona
        system_prompt = {
            "role": "system", 
            "content": (
                "You are Mitr AI, a secure and vigilant administrative assistant for the Med Mitra hospital system. "
                "Your role is to analyze system logs, detect anomalies, and summarize data for the administrator. "
                "You have READ-ONLY access. You cannot modify data. "
                "Be concise, professional, and highlight security risks primarily."
            )
        }
        
        # Context formatting
        context_str = f"Context Data: {str(request.context_data)}"
        
        messages = [
            system_prompt,
            {"role": "user", "content": f"{context_str}\n\nUser Query: {request.query}"}
        ]

        # Generate
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        generated_ids = model.generate(
            inputs.input_ids,
            attention_mask=inputs.attention_mask,
            pad_token_id=tokenizer.eos_token_id,
            max_new_tokens=request.max_tokens,
            temperature=0.5, # Lower temp for analytical tasks
            do_sample=True
        )
        
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(inputs.input_ids, generated_ids)
        ]
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return {"response": response}

    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TTSRequest(BaseModel):
    text: str
    language: str = "en"

class TranslationRequest(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str

@app.get("/")
def health_check():
    return {"status": "ok", "service": "ml-server", "features": ["tts", "translation", "fine-tuning"]}

@app.post("/api/tts")
def generate_speech(request: TTSRequest):
    from fastapi.responses import FileResponse
    try:
        output_file = f"output_{hash(request.text)}.mp3"
        path = tts_engine.speak(request.text, output_file)
        if path and os.path.exists(path):
             return FileResponse(path, media_type="audio/mpeg", filename="response.mp3")
        else:
             raise HTTPException(status_code=500, detail="TTS Generation failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translate")
def translate_text(request: TranslationRequest):
    try:
        translated = translator.translate(request.text, request.src_lang, request.tgt_lang)
        return {"translated_text": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze_image")
async def analyze_image(file: UploadFile = File(...)):
    import google.generativeai as genai
    from PIL import Image
    import io
    
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             # Fallback or error
             raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        response = model.generate_content(["Describe this medical image and identify any potential anomalies.", image])
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
