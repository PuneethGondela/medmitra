from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

try:
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")
    print("Tokenizer loaded.")

    print("Loading model...")
    model = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M")
    print("Model loaded.")
    
    print("Testing translation...")
    inputs = tokenizer("Hello world", return_tensors="pt")
    gen = model.generate(**inputs, forced_bos_token_id=tokenizer.lang_code_to_id["hin_Deva"])
    print("Translation:", tokenizer.decode(gen[0], skip_special_tokens=True))

except Exception as e:
    print("CRITICAL ERROR:")
    print(e)
    import traceback
    traceback.print_exc()
