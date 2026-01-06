from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

MODEL_NAME = "facebook/nllb-200-distilled-600M"
print(f"Loading {MODEL_NAME}...")

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_safetensors=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, use_safetensors=True)
    print("SUCCESS: Model Loaded!")
except Exception as e:
    print(f"FAILED: Load Failed: {e}")
    exit()

def translate(text, src_lang, tgt_lang):
    print(f"\nTranslating... ({src_lang} -> {tgt_lang})")
    
    # NLLB Codes
    lang_map = {
        "telugu": "tel_Telu",
        "english": "eng_Latn",
        "hindi": "hin_Deva"
    }
    
    src = lang_map[src_lang]
    tgt = lang_map[tgt_lang]
    
    tokenizer.src_lang = src
    inputs = tokenizer(text, return_tensors="pt")
    
    generated_tokens = model.generate(
        **inputs, 
    forced_bos_token_id=tokenizer.convert_tokens_to_ids(tgt), 
        max_length=100
    )
    
    result = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
    print(f"👉 Result: {result}")

# Test Cases
translate("నాకు తల తిరుగుతుంది", "telugu", "english")
translate("I have stomach pain", "english", "telugu")
