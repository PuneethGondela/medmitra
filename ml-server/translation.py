from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

class Translator:
    def __init__(self, model_name="facebook/nllb-200-distilled-600M", device="cuda" if torch.cuda.is_available() else "cpu"):
        self.model_name = model_name
        self.device = device
        self.model = None
        self.tokenizer = None
        
        # Language codes map (Simplified)
        self.lang_map = {
            "en": "eng_Latn",
            "te": "tel_Telu",
            "hi": "hin_Deva",
            "ta": "tam_Taml",
            "kn": "kan_Knda",
            "ml": "mal_Mlym",
            "or": "ory_Orya",
            "bn": "ben_Beng",
            "gu": "guj_Gujr",
            "mr": "mar_Deva"
        }

    def load_model(self):
        if self.model is None:
            print(f"Loading Translation Model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name).to(self.device)

    def translate(self, text: str, src_lang: str, tgt_lang: str) -> str:
        self.load_model() # Lazy load
        
        src_code = self.lang_map.get(src_lang, "eng_Latn")
        tgt_code = self.lang_map.get(tgt_lang, "eng_Latn")
        
        self.tokenizer.src_lang = src_code
        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)
        
        translated_tokens = self.model.generate(
            **inputs, 
            forced_bos_token_id=self.tokenizer.lang_code_to_id[tgt_code], 
            max_length=512
        )
        
        return self.tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
